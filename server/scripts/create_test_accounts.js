require('dotenv').config();
const { createTestAccounts } = require('../services/devSeedService');

(async () => {
  try {
    const result = await createTestAccounts();
    console.log('All test accounts created.');
    console.log(result);
  } catch (err) {
    console.error('Error creating test accounts:', err.message || err);
    process.exitCode = 1;
  }
})();
