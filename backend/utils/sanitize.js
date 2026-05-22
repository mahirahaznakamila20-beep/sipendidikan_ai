const sanitizeText = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim();
};

const sanitizeObject = (payload) => {
  const clean = {};
  Object.keys(payload || {}).forEach((key) => {
    clean[key] = sanitizeText(payload[key]);
  });
  return clean;
};

module.exports = { sanitizeText, sanitizeObject };
