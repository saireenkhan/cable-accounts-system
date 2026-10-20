
const express = require('express');
const router = express.Router();

const {
  login,
  getMe,
  updateMe,
  updatePassword,
  updateAvatar,
  verifyPassword,
  updateTenantName,
} = require('../controllers/authController');

const {
  protect,
  authorize,
  requireTenant,
} = require('../middleware/auth');

// ============================================
// 1. PUBLIC COMPANY LOGIN
// ============================================
// POST /api/auth/login

router.post('/login', login);

// ============================================
// 2. AUTHENTICATED USER PROFILE
// ============================================
// All routes below require valid JWT
// ============================================

router.use(protect);

// GET /api/auth/me
router.get('/me', getMe);

// PUT /api/auth/me
router.put('/me', updateMe);

// PUT /api/auth/password
router.put('/password', updatePassword);

// PUT /api/auth/avatar
router.put('/avatar', updateAvatar);

// POST /api/auth/verify-password
router.post('/verify-password', verifyPassword);

// ============================================
// 3. COMPANY ADMINISTRATION
// ============================================
// Only a company administrator can update
// their own company's name.
// ============================================

// PUT /api/auth/tenant/name
router.put(
  '/tenant/name',
  requireTenant,
  authorize('admin'),
  updateTenantName
);

module.exports = router;
