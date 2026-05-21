const { verifyToken } = require('../utils/jwt');
const supabase = require('../services/supabaseClient');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const err = new Error('Unauthorized');
      err.status = 401;
      throw err;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    // sanitize injected user object to only safe fields
    req.user = {
      id: payload.id,
      role: payload.role,
      school_id: payload.school_id,
      email: payload.email,
    };

    // attach school's NPSN to req.user when possible for tenant checks
    if (req.user.school_id) {
      const { data: school, error } = await supabase.from('schools').select('npsn').eq('id', req.user.school_id).maybeSingle();
      if (!error && school) {
        req.user.npsn = school.npsn;
      }
    }

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      err.status = 401;
      err.message = 'Token expired';
    }
    err.status = err.status || 401;
    return next(err);
  }
};

module.exports = authenticate;
