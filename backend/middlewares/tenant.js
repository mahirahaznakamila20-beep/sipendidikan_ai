const supabase = require('../services/supabaseClient');
const { error: sendError } = require('../utils/response');

// Ensure the resource with :idParam in table belongs to current user's school_id
module.exports = (table, idParam = 'id', idColumn = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParam];
      if (!resourceId) return next();
      const { school_id } = req.user || {};
      // if user has no school scope (super-admin), allow through
      if (!school_id) return next();

      const { data, error } = await supabase.from(table).select('school_id').eq(idColumn, resourceId).maybeSingle();
      if (error || !data) return sendError(res, 'Resource tidak ditemukan', 404);
      if (data.school_id !== school_id) return sendError(res, 'Resource tidak ditemukan', 404);
      return next();
    } catch (err) {
      return sendError(res, err.message || 'Tenant check failed', 500);
    }
  };
};
