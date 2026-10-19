
const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const requireMaster = require('../middleware/requireMaster');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

// ============================================
// 1. MASTER LOGIN (PUBLIC ROUTE)
// ============================================
// POST /api/master/login

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      role: 'superadmin',
      tenantId: null,
      isActive: true,
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Master credentials',
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '8h',
      }
    );

    await User.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: 'Master login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Master login error:', error);

    return res.status(500).json({
      success: false,
      message: 'Master login failed',
    });
  }
});

// ============================================
// MASTER AUTHORIZATION
// ============================================
// All routes below require a valid Master JWT

router.use(requireMaster);

// ============================================
// 2. VERIFY MASTER LOGIN
// ============================================
// GET /api/master/me

router.get('/me', (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

// ============================================
// 3. MASTER DASHBOARD STATISTICS
// ============================================
// GET /api/master/dashboard

router.get('/dashboard', async (req, res) => {
  try {
    const [
      companies,
      activeCompanies,
      admins,
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'admin' }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        companies,
        activeCompanies,
        admins,
      },
    });
  } catch (error) {
    console.error('Master dashboard error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load dashboard statistics',
    });
  }
});

// ============================================
// 4. GET ALL COMPANIES
// ============================================
// GET /api/master/companies

router.get('/companies', async (req, res) => {
  try {
    const companies = await Tenant.find()
      .sort({ createdAt: -1 })
      .lean();

    const result = await Promise.all(
      companies.map(async (company) => {
        const admins = await User.find({
          tenantId: company._id,
          role: 'admin',
        })
          .select('name email isActive')
          .lean();

        return {
          ...company,
          admins,
        };
      })
    );

    return res.status(200).json({
      success: true,
      companies: result,
    });
  } catch (error) {
    console.error('Master companies error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load companies',
    });
  }
});

module.exports = router;
