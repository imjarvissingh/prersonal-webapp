const { GoogleGenAI, Type } = require('@google/genai');
const { env } = require('../config/env');
const { HttpError } = require('../utils/httpError');
const { planSchema } = require('./planSchema');

let client = null;

function getClient() {
  if (!env.geminiApiKey) {
    throw new HttpError(503, 'AI scaffolding is not configured: set GEMINI_API_KEY on the server');
  }
  if (!client) client = new GoogleGenAI({ apiKey: env.geminiApiKey });
  return client;
}

const level = { type: Type.STRING, enum: ['low', 'medium', 'high'] };

// Gemini structured-output schema mirroring planSchema.
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Short project name, max 80 characters' },
    description: { type: Type.STRING, description: 'One or two sentence summary of the outcome' },
    milestones: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          durationDays: { type: Type.INTEGER, description: 'Working days this milestone needs' },
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Concrete action starting with a verb' },
                notes: { type: Type.STRING, description: 'Acceptance criteria or helpful detail' },
                priority: level,
                energy: { ...level, description: 'Mental energy the task demands' },
                estimateMinutes: { type: Type.INTEGER, description: 'Between 15 and 240' },
              },
              required: ['title', 'priority', 'energy', 'estimateMinutes'],
              propertyOrdering: ['title', 'notes', 'priority', 'energy', 'estimateMinutes'],
            },
          },
        },
        required: ['title', 'durationDays', 'tasks'],
        propertyOrdering: ['title', 'description', 'durationDays', 'tasks'],
      },
    },
  },
  required: ['title', 'description', 'milestones'],
  propertyOrdering: ['title', 'description', 'milestones'],
};

const SYSTEM_INSTRUCTION = `You are a senior engineering project planner inside "Dev Tracker", a personal productivity app.
Turn the user's idea into an actionable plan:
- 3 to 7 milestones in delivery order, each a shippable checkpoint.
- 3 to 8 tasks per milestone. Each task is a single sitting of work (15-240 minutes) and starts with a verb.
- energy: "high" for deep design/debugging/new code, "medium" for routine implementation, "low" for admin, docs, small fixes.
- priority: "high" for blockers on the critical path, "low" for nice-to-haves.
- durationDays: realistic working days for one developer.
Respond only with JSON matching the schema. Do not invent dates.`;

function buildPrompt(prompt, { deadline, today }) {
  const lines = [`Project idea: ${prompt.trim()}`, `Today is ${today}.`];
  if (deadline) lines.push(`Target completion date: ${deadline}. Fit the milestone durations inside it.`);
  return lines.join('\n');
}

// Parses model output, tolerating code fences, and validates it against planSchema.
function parsePlan(text) {
  if (!text) throw new HttpError(502, 'The AI returned an empty response');
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
  let raw;
  try {
    raw = JSON.parse(cleaned);
  } catch {
    throw new HttpError(502, 'The AI returned a response that was not valid JSON');
  }
  const result = planSchema.safeParse(raw);
  if (!result.success) {
    throw new HttpError(502, 'The AI returned a plan in an unexpected shape, please try again');
  }
  return result.data;
}

// Statuses where another model may succeed: overloaded (503), rate limited
// (429), transient server errors, or a model retired for this key (404).
const RETRYABLE = new Set([404, 429, 500, 502, 503, 504]);
const TOTAL_TIMEOUT_MS = 70000;

function modelChain() {
  return [...new Set([env.geminiModel, ...env.geminiFallbackModels])];
}

// Tries the configured model, then each fallback, within one overall deadline.
async function generatePlan(prompt, { deadline, today }, { client } = {}) {
  const ai = client || getClient();
  const signal = AbortSignal.timeout(TOTAL_TIMEOUT_MS);
  let lastStatus = 502;

  for (const model of modelChain()) {
    if (signal.aborted) break;
    try {
      const response = await ai.models.generateContent({
        model,
        contents: buildPrompt(prompt, { deadline, today }),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.4,
          abortSignal: signal,
        },
      });
      return parsePlan(response.text);
    } catch (err) {
      if (err instanceof HttpError) throw err;
      lastStatus = err.status || 502;
      console.error(`[gemini] ${model} failed (${lastStatus}): ${err.message}`);
      if (!RETRYABLE.has(lastStatus)) break;
    }
  }

  if (signal.aborted) throw new HttpError(504, 'The AI took too long to respond, please try again');
  if (lastStatus === 429) throw new HttpError(429, 'AI rate limit reached, try again shortly');
  if (lastStatus === 503) throw new HttpError(503, 'The AI service is busy right now, try again in a minute');
  if (lastStatus === 401 || lastStatus === 403) {
    throw new HttpError(502, 'The server\'s Gemini API key was rejected');
  }
  throw new HttpError(502, 'Could not reach the AI service');
}

module.exports = { generatePlan, parsePlan, buildPrompt, modelChain, responseSchema };
