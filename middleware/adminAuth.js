// Simple shared-secret protection for the admin/database routes.
// Not a full user-role system, but stops random visitors from viewing
// signups/logins just because they found the page.
function requireAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!process.env.ADMIN_KEY) {
    return res.status(500).json({ error: 'Admin access is not configured on this server.' });
  }
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Invalid or missing admin key.' });
  }
  next();
}

module.exports = { requireAdminKey };
