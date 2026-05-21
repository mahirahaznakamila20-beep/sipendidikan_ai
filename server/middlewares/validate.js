const { ZodError } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    const data = {};
    if (req.method === 'GET' || req.method === 'DELETE') data.query = req.query;
    data.body = req.body;
    data.params = req.params;
    const result = schema.parse({ ...data.body, ...data.params, ...data.query });
    req.validated = result;
    return next();
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
      return res.status(400).json({ success: false, message: 'Validation failed', errors: details });
    }
    return next(err);
  }
};

module.exports = validate;
