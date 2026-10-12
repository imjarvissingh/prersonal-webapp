# Dev Tracker

A personal productivity platform in one monorepo:

1. **AI project scaffolding.** Describe a project and Gemini breaks it into milestones and tasks you can edit before saving.
2. **Smart daily tasks.** Day planner with time blocks, energy tags, energy-aware auto time-blocking and an automatic midnight rollover of unfinished work.
3. **Professional dashboard.** Progress bars and Green/Yellow/Red project health computed from task completion, overdue work and the calendar.

| Folder | What | Stack |
| --- | --- | --- |
| [`backend/`](backend) | REST API, rollover job, Gemini integration | Node 20+, Express 5, Mongoose 9, MongoDB Atlas |
| [`web/`](web) | Web dashboard | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| [`mobile/`](mobile) | iPhone app | Flutter 3, Provider, Keychain storage |

## Quick start

```bash
./setup.sh                 # installs everything, creates backend/.env and web/.env.local
# edit backend/.env: MONGODB_URI and GEMINI_API_KEY
npm run dev:backend        # API on http://localhost:4000
npm run dev:web            # web app on http://localhost:3000
cd mobile && flutter run -d ios --dart-define=API_URL=http://localhost:4000
```

`setup.sh` accepts `--skip-backend`, `--skip-web` and `--skip-mobile`. It never overwrites an existing `.env`, and it generates a random `JWT_SECRET` the first time.

## Configuration

Secrets live only in untracked env files. Templates:

**`backend/.env`** (from [`backend/.env.example`](backend/.env.example))

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string (required) |
| `JWT_SECRET` | Token signing secret, 32+ random chars in production (required) |
| `GEMINI_API_KEY` | Google AI Studio key; without it AI endpoints return 503 and everything else works |
| `GEMINI_MODEL` | Defaults to `gemini-flash-latest` |
| `GEMINI_FALLBACK_MODELS` | Tried in order when the main model is busy, rate limited or retired (default `gemini-3.8-flash,gemini-3.1-flash-lite`) |
| `APP_TIMEZONE` | IANA zone that defines "today" and when midnight is (default `Asia/Kolkata`) |
| `ROLLOVER_CRON` | Rollover schedule in `APP_TIMEZONE`, default `0 0 * * *` |
| `CORS_ORIGINS` | Comma-separated web origins allowed to call the API |
| `PORT`, `JWT_EXPIRES_IN`, `NODE_ENV` | Usual server settings |

**`web/.env.local`**: `NEXT_PUBLIC_API_URL` (the API base URL).

**Mobile**: `--dart-define=API_URL=https://api.example.com` at build time. The server can also be changed from the sign-in screen, which helps when running on a physical iPhone against a dev machine on the LAN.

## How it works

### Rollover
A `node-cron` job runs at midnight in `APP_TIMEZONE` and moves every unfinished task scheduled before today onto today. It keeps the task's first planned date (`originalDate`), increments `rolloverCount`, and clears the old time block. The server also runs a catch-up pass at startup, and both clients call `POST /api/tasks/rollover` when they open, so a server that was down at midnight never leaves stale days behind. The update is idempotent.

### Project health
Computed in [`backend/src/services/health.js`](backend/src/services/health.js) and shown identically on web and mobile, with the reasons:

- **Red**: past the due date with open tasks, more than 25 points behind the calendar (expected progress is the share of time elapsed between start and due date), or 30%+ of open tasks overdue.
- **Yellow**: more than 10 points behind, any overdue task, any task rolled over 3+ times, or no tasks yet.
- **Green**: everything else, and any project whose tasks are all done.

### Auto time-blocking
`POST /api/tasks/auto-schedule` fills the gaps in your working hours (Settings, default 09:00–18:00) with the day's unblocked tasks: high-energy work first so it lands in the morning, then by priority. Existing blocks are respected, and on today nothing is placed in the past.

### AI scaffolding
`POST /api/ai/plan` asks Gemini for structured JSON (enforced with a response schema, then validated with zod). The client shows the draft for editing; `POST /api/ai/projects` saves it in one MongoDB transaction. Milestone due dates are computed on the server from the model's duration estimates and squeezed to fit a deadline, so the model never invents dates. Generated tasks land in the backlog, ready to pull into a day.

## API

All routes except auth and health need `Authorization: Bearer <token>`. Dates are `YYYY-MM-DD`, times `HH:mm`.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | Liveness and DB state |
| POST | `/api/auth/register`, `/api/auth/login` | `{ name?, email, password }` → `{ token, user }` |
| GET / PATCH | `/api/auth/me` | Profile, working hours, password change |
| GET | `/api/dashboard` | Totals, today's summary, energy budget, 7-day activity, projects with health |
| GET / POST | `/api/projects` | `?status=active\|on_hold\|completed\|archived\|all` (default hides archived) |
| GET / PATCH / DELETE | `/api/projects/:id` | Detail includes milestones (with progress) and tasks; delete cascades |
| POST | `/api/projects/:id/milestones` | |
| PATCH / DELETE | `/api/milestones/:id` | Deleting keeps the tasks, ungrouped |
| GET / POST | `/api/tasks` | Filters: `date`, `from`, `to`, `project`, `milestone`, `status`, `energy`, `backlog=true`, `overdue=true` |
| GET / PATCH / DELETE | `/api/tasks/:id` | |
| POST | `/api/tasks/rollover` | Roll the signed-in user's unfinished tasks to today |
| POST | `/api/tasks/auto-schedule` | `{ date? }` |
| POST | `/api/tasks/reorder` | `{ ids: [...] }` |
| POST | `/api/ai/plan` | `{ prompt, deadline? }` → `{ plan }` (rate-limited per user) |
| POST | `/api/ai/projects` | `{ plan, prompt?, deadline?, startDate?, color? }` → `{ project }` |
| POST | `/api/ai/scaffold` | Generate and save in one call |

## Deployment

### API on an Ubuntu VPS
```bash
git clone https://github.com/imjarvissingh/prersonal-webapp.git && cd prersonal-webapp/backend
bash deploy/provision-ubuntu.sh api.example.com   # Node 22, PM2, nginx, certbot
```
The script stops after creating `.env` so you can fill it in, then re-run it. PM2 runs a single instance ([`deploy/ecosystem.config.js`](backend/deploy/ecosystem.config.js)) behind nginx ([`deploy/nginx.conf`](backend/deploy/nginx.conf)). In Atlas, allow the VPS IP under Network Access.

### Web on Vercel (or any Next.js host)
Import the repo, set the root directory to `web`, and set `NEXT_PUBLIC_API_URL`. Add the web origin to `CORS_ORIGINS` on the API. Every page renders in the browser, so there is no server-side secret in the web app.

### iOS
```bash
cd mobile
flutter build ipa --dart-define=API_URL=https://api.example.com
```
Open `ios/Runner.xcworkspace` in Xcode to set your team and bundle id (`com.devtracker.devTracker` by default). The token is stored in the iOS Keychain. Debug builds may call `http://` on localhost or the LAN; production should use HTTPS.

## Development

```bash
npm run lint        # backend + web
npm test            # backend unit tests
npm --prefix web run build
cd mobile && flutter analyze && flutter test
```
CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs all of the above on every pull request.
