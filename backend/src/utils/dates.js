const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Returns the calendar date (YYYY-MM-DD) of `date` as seen in `timeZone`.
function toDateKey(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function todayKey(timeZone, now = new Date()) {
  return toDateKey(now, timeZone);
}

function isDateKey(value) {
  if (typeof value !== 'string' || !DATE_KEY_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// Adds whole days to a YYYY-MM-DD key without touching timezones.
function addDays(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

// Number of days from `fromKey` to `toKey` (negative if toKey is earlier).
function diffDays(fromKey, toKey) {
  const toUtc = (k) => {
    const [y, m, d] = k.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(toKey) - toUtc(fromKey)) / 86400000);
}

// Monday-based start of week for a date key.
function startOfWeek(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  const offset = dow === 0 ? -6 : 1 - dow;
  return addDays(dateKey, offset);
}

module.exports = { DATE_KEY_RE, toDateKey, todayKey, isDateKey, addDays, diffDays, startOfWeek };
