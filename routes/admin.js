const express = require('express');
const User = require('../models/User');
const Login = require('../models/Login');
const { requireAdminKey } = require('../middleware/adminAuth');

const router = express.Router();
router.use(requireAdminKey);

router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'name email phone createdAt').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Could not load users.' });
  }
});

router.get('/logins', async (req, res) => {
  try {
    const logins = await Login.find({}, 'name email createdAt').sort({ createdAt: -1 }).limit(50);
    res.json({ logins });
  } catch (err) {
    res.status(500).json({ error: 'Could not load login records.' });
  }
});

module.exports = router;
