/**
 * Authentication middleware for the check-in app API.
 * Assumes express-session is configured and req.session.user is set on login.
 */

/**
 * Require an authenticated user. Sets req.user from req.session.user.
 * Responds 401 if not logged in.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }
  return res.status(401).json({ success: false, error: 'Authentication required' });
}

/**
 * Require the authenticated user to have one of the given roles.
 * Use after requireAuth. Responds 403 if role doesn't match.
 * @param {...string} roles - Allowed user_type values (e.g. 'director', 'teacher')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (roles.includes(req.user.user_type)) {
      return next();
    }
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  };
}

module.exports = { requireAuth, requireRole };
