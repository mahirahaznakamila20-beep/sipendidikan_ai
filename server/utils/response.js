const success = (res, data = {}, message = 'Success') => {
  return res.json({ success: true, message, data });
};

const error = (res, message = 'Bad Request', status = 400, details = null) => {
  const payload = { success: false, message };
  if (details) payload.details = details;
  return res.status(status).json(payload);
};

module.exports = { success, error };
