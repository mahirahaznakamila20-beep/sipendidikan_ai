const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const port = process.env.PORT || 5000;
const host = process.env.HOST || '0.0.0.0';

if (require.main === module) {
  app.listen(port, host, () => {
    console.log(`siPENDIdikan_AI backend running on ${host}:${port}`);
  });
}

module.exports = app;
