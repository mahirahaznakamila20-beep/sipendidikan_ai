// JWT configuration
module.exports = {
  accessToken: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '15m',
  },
  refreshToken: {
    expiresInDays: parseInt(process.env.REFRESH_EXPIRE_DAYS || 7),
  },
};
