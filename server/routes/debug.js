// Test routes for debugging
const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all users (for debugging)
router.get('/users', auth, async (req, res) => {
  try {
    const users = await User.find({}, 'username email _id');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Find user by email (for debugging)
router.get('/users/email/:email', auth, async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email: email.toLowerCase() });
    res.json(user ? { found: true, user: { id: user._id, username: user.username, email: user.email } } : { found: false });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
