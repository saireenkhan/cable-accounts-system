const express = require('express');
const router = express.Router();
const {
  login,
  getMe,
  updateMe,
  updatePassword,
  updateAvatar,
  verifyPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/password', protect, updatePassword);
router.put('/avatar', protect, updateAvatar);
router.post('/verify-password', protect, verifyPassword);

module.exports = router;