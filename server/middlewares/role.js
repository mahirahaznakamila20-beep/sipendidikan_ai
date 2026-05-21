const { error } = require('../utils/response');

const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user || !allowedRoles.includes(user.role)) {
      return error(res, 'Forbidden', 403);
    }
    next();
  };
};

module.exports = authorize;
