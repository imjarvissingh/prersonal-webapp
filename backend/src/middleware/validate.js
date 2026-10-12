const { badRequest } = require('../utils/httpError');

// Validates req[source] against a zod schema and replaces it with the parsed value.
// Express 5 exposes req.query as a getter, so parsed query values go to req.validatedQuery.
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(badRequest(details[0]?.message || 'Invalid request', details));
    }
    if (source === 'query') {
      req.validatedQuery = result.data;
    } else {
      req[source] = result.data;
    }
    return next();
  };
}

module.exports = { validate };
