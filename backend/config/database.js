// Database configuration
module.exports = {
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  database: {
    // Database settings
    maxConnections: 20,
    connectionTimeout: 5000,
  },
};
