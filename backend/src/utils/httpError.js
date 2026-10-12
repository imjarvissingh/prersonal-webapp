class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const badRequest = (msg, details) => new HttpError(400, msg, details);
const unauthorized = (msg = 'Authentication required') => new HttpError(401, msg);
const notFound = (msg = 'Not found') => new HttpError(404, msg);
const conflict = (msg) => new HttpError(409, msg);

module.exports = { HttpError, badRequest, unauthorized, notFound, conflict };
