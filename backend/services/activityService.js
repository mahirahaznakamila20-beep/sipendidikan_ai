const supabase = require('./supabaseClient');

const logActivity = async ({ user_id, action, metadata }) => {
  await supabase.from('activity_logs').insert([{ user_id, action, metadata }]);
};

module.exports = { logActivity };
