// Shared toJSON settings: expose `id`, hide `_id`/`__v` and any `hidden` fields.
function jsonTransform(schema, hidden = []) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
      ret.id = String(ret._id);
      delete ret._id;
      for (const field of hidden) delete ret[field];
      return ret;
    },
  });
}

module.exports = { jsonTransform };
