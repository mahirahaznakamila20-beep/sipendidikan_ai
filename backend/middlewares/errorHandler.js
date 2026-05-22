const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    logger.error(err);
  } else {
    logger.warn(err.message || 'Client error');
  }
  const message = err.message || 'Internal Server Error';
  const details = err.details || null;
  return res.status(status).json({ success: false, message, errors: details });
};

module.exports = errorHandler;
