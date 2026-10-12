const { z } = require('zod');
const { isDateKey } = require('../utils/dates');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const dateKey = z.string().refine(isDateKey, 'Date must be YYYY-MM-DD');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm');
const level = z.enum(['low', 'medium', 'high']);

const idParams = z.object({ id: objectId });

module.exports = { z, objectId, dateKey, time, level, idParams };
