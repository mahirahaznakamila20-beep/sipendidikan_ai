// Server configuration
module.exports = {
  port: process.env.PORT || 5000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:5000'],
  fileUpload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || 10485760), // 10MB
    maxFiles: parseInt(process.env.MAX_UPLOAD_FILES || 5),
  },
};
