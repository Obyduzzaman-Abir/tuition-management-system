// middleware/auth.js
// Verifies a JWT sent by the frontend, and optionally checks the user's role.

const jwt = require('jsonwebtoken');

// Checks that a valid token was sent. Attaches the decoded user info to req.user.
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // expects "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'No token provided. Please log in.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token. Please log in again.' });
    }
    req.user = user; // { user_id, name, role }
    next();
  });
}

// Use after authenticateToken to restrict a route to specific roles.
// Example: requireRole('Admin') or requireRole('Student', 'Admin')
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: `Only ${allowedRoles.join(' or ')} accounts can do this.` });
    }
    next();
  };
}

module.exports = { authenticateToken, requireRole };