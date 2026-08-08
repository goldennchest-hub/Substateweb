const jwt = require('jsonwebtoken');

// Attaches req.user if a valid token is present; does NOT block the request if missing.
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, name: payload.name, email: payload.email };
  } catch (e) {
    // invalid/expired token — just treat as a guest
  }
  next();
}

// Blocks the request with 401 if no valid token is present.
function requireAuth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user) return res.status(401).json({ error: 'You must be logged in.' });
    next();
  });
}

module.exports = { optionalAuth, requireAuth };
