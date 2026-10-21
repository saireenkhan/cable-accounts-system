
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const router = express.Router();

const requireMaster = require('../middleware/requireMaster');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const MasterPackage = require('../models/MasterPackage');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

function adminQuery(id) {
  return {
    _id: id,
    role: 'admin',
    tenantId: { $ne: null },
  };
}

async function resolvePackage(id) {
  if (!isValidId(id)) return null;

  return MasterPackage.findOne({
    _id: id,
    isActive: true,
  });
}

function formatAdmin(admin) {
  const company =
    admin.tenantId &&
    typeof admin.tenantId === 'object' &&
    admin.tenantId.name
      ? admin.tenantId
      : null;

  return {
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    phone: admin.phone || '',
    address: admin.address || '',
    isActive: admin.isActive,
    createdAt: admin.createdAt,
    company: company
      ? {
          _id: company._id,
          name: company.name,
          ownerEmail: company.ownerEmail,
          plan: company.plan,
          masterPackageId: company.masterPackageId,
          isActive: company.isActive,
        }
      : null,
  };
}

// ======================================================
// MASTER LOGIN
// POST /api/master/login
// ======================================================

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return fail(res, 400, 'Email and password are required');
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      role: 'superadmin',
      tenantId: null,
      isActive: true,
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return fail(res, 401, 'Invalid Master credentials');
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const token = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    await User.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    return res.json({
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
    console.error('Master login:', error);
    return fail(res, 500, 'Master login failed');
  }
});

// Protect every route below.
router.use(requireMaster);

// ======================================================
// VERIFY MASTER
// GET /api/master/me
// ======================================================

router.get('/me', (req, res) => {
  return res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

// ======================================================
// DASHBOARD
// GET /api/master/dashboard
// ======================================================

router.get('/dashboard', async (req, res) => {
  try {
    const [companies, activeCompanies, admins] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ isActive: true }),
      User.countDocuments({
        role: 'admin',
        tenantId: { $ne: null },
      }),
    ]);

    return res.json({
      success: true,
      stats: {
        companies,
        activeCompanies,
        admins,
      },
    });
  } catch (error) {
    console.error('Master dashboard:', error);
    return fail(res, 500, 'Failed to load dashboard');
  }
});

// ======================================================
// GET ALL COMPANIES
// GET /api/master/companies
// ======================================================

router.get('/companies', async (req, res) => {
  try {
    const companies = await Tenant.find()
      .sort({ createdAt: -1 })
      .lean();

    const companyIds = companies.map(company => company._id);

    const admins = await User.find({
      tenantId: { $in: companyIds },
      role: 'admin',
    })
      .select('name email isActive tenantId')
      .lean();

    const adminsByTenant = new Map();

    for (const admin of admins) {
      const key = String(admin.tenantId);

      if (!adminsByTenant.has(key)) {
        adminsByTenant.set(key, []);
      }

      adminsByTenant.get(key).push(admin);
    }

    return res.json({
      success: true,
      companies: companies.map(company => ({
        ...company,
        admins: adminsByTenant.get(String(company._id)) || [],
      })),
    });
  } catch (error) {
    console.error('Get companies:', error);
    return fail(res, 500, 'Failed to load companies');
  }
});

// ======================================================
// CREATE COMPANY AND ADMIN
// POST /api/master/companies
// ======================================================

router.post('/companies', async (req, res) => {
  let createdCompany = null;
  let createdAdmin = null;

  try {
    const {
      companyName,
      ownerEmail,
      adminName,
      adminEmail,
      adminPassword,
      masterPackageId,
    } = req.body || {};

    if (
      typeof companyName !== 'string' ||
      typeof ownerEmail !== 'string' ||
      typeof adminName !== 'string' ||
      typeof adminEmail !== 'string' ||
      typeof adminPassword !== 'string' ||
      !companyName.trim() ||
      !ownerEmail.trim() ||
      !adminName.trim() ||
      !adminEmail.trim()
    ) {
      return fail(res, 400, 'All required fields must be provided');
    }

    if (companyName.trim().length > 120) {
      return fail(res, 400, 'Company name is too long');
    }

    if (
      !EMAIL_REGEX.test(ownerEmail.trim()) ||
      !EMAIL_REGEX.test(adminEmail.trim())
    ) {
      return fail(res, 400, 'Invalid email address');
    }

    if (
      adminPassword.length < 8 ||
      adminPassword.length > 128
    ) {
      return fail(res, 400, 'Password must be 8 to 128 characters');
    }

    // Validate actual package stored in MongoDB.
    const selectedPackage = await resolvePackage(masterPackageId);

    if (!selectedPackage) {
      return fail(
        res,
        400,
        'Please select a valid active subscription package'
      );
    }

    const normalizedEmail = adminEmail.trim().toLowerCase();

    const existingAdmin = await User.exists({
      email: normalizedEmail,
    });

    if (existingAdmin) {
      return fail(res, 409, 'Administrator email already exists');
    }

    const slugBase =
      companyName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'company';

    const slug = `${slugBase}-${new mongoose.Types.ObjectId()
      .toString()
      .slice(-10)}`;

    // Assign the selected Master Package to the tenant.
    createdCompany = await Tenant.create({
      name: companyName.trim(),
      slug,
      ownerEmail: ownerEmail.trim().toLowerCase(),
      plan: selectedPackage.name.trim().toLowerCase(),
      masterPackageId: selectedPackage._id,
      isActive: true,
    });

    // User model hashes the password on save.
    createdAdmin = await User.create({
      name: adminName.trim(),
      email: normalizedEmail,
      password: adminPassword,
      role: 'admin',
      tenantId: createdCompany._id,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Company and administrator created successfully',
      company: {
        id: createdCompany._id,
        name: createdCompany.name,
        slug: createdCompany.slug,
        ownerEmail: createdCompany.ownerEmail,
        plan: createdCompany.plan,
        masterPackageId: createdCompany.masterPackageId,
        isActive: createdCompany.isActive,
      },
      admin: {
        id: createdAdmin._id,
        tenantId: createdCompany._id,
        name: createdAdmin.name,
        email: createdAdmin.email,
        role: createdAdmin.role,
        isActive: createdAdmin.isActive,
      },
    });
  } catch (error) {
    console.error('Create company:', error);

    // Clean up incomplete company creation.
    if (createdAdmin) {
      try {
        await User.findByIdAndDelete(createdAdmin._id);
      } catch (cleanupError) {
        console.error('Admin cleanup:', cleanupError);
      }
    }

    if (createdCompany) {
      try {
        await Tenant.findByIdAndDelete(createdCompany._id);
      } catch (cleanupError) {
        console.error('Company cleanup:', cleanupError);
      }
    }

    return fail(
      res,
      error.code === 11000 ? 409 : 500,
      error.code === 11000
        ? 'Duplicate company or administrator'
        : 'Failed to create company and administrator'
    );
  }
});

// ======================================================
// GET ALL ADMINISTRATORS
// GET /api/master/admins
// ======================================================

router.get('/admins', async (req, res) => {
  try {
    const admins = await User.find({
      role: 'admin',
      tenantId: { $ne: null },
    })
      .select('name email phone address isActive tenantId createdAt')
      .populate(
        'tenantId',
        'name ownerEmail plan masterPackageId isActive'
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      admins: admins.map(formatAdmin),
    });
  } catch (error) {
    console.error('Get admins:', error);
    return fail(res, 500, 'Failed to load administrators');
  }
});

// ======================================================
// VIEW ADMINISTRATOR
// GET /api/master/admins/:id
// ======================================================

router.get('/admins/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return fail(res, 400, 'Invalid administrator ID');
    }

    const admin = await User.findOne(adminQuery(req.params.id))
      .select('name email phone address isActive tenantId createdAt')
      .populate(
        'tenantId',
        'name ownerEmail plan masterPackageId isActive'
      )
      .lean();

    if (!admin) {
      return fail(res, 404, 'Administrator not found');
    }

    return res.json({
      success: true,
      admin: formatAdmin(admin),
    });
  } catch (error) {
    console.error('View admin:', error);
    return fail(res, 500, 'Failed to load administrator');
  }
});

// ======================================================
// EDIT ADMINISTRATOR AND COMPANY
// PATCH /api/master/admins/:id
// ======================================================

router.patch('/admins/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return fail(res, 400, 'Invalid administrator ID');
    }

    const admin = await User.findOne(adminQuery(req.params.id));

    if (!admin) {
      return fail(res, 404, 'Administrator not found');
    }

    const company = await Tenant.findById(admin.tenantId);

    if (!company) {
      return fail(res, 404, 'Linked company not found');
    }

    const body = req.body || {};

    // Administrator name
    if (body.name !== undefined) {
      if (
        typeof body.name !== 'string' ||
        !body.name.trim()
      ) {
        return fail(res, 400, 'Invalid administrator name');
      }

      admin.name = body.name.trim();
    }

    // Administrator email
    if (body.email !== undefined) {
      if (
        typeof body.email !== 'string' ||
        !EMAIL_REGEX.test(body.email.trim())
      ) {
        return fail(res, 400, 'Invalid administrator email');
      }

      const email = body.email.trim().toLowerCase();

      const existing = await User.exists({
        email,
        _id: { $ne: admin._id },
      });

      if (existing) {
        return fail(res, 409, 'Email already registered');
      }

      admin.email = email;
    }

    // Phone and address
    for (const field of ['phone', 'address']) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== 'string') {
          return fail(res, 400, `Invalid ${field}`);
        }

        admin[field] = body[field].trim();
      }
    }

    // Administrator status
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') {
        return fail(res, 400, 'Invalid account status');
      }

      admin.isActive = body.isActive;
    }

    // Optional password reset
    if (
      body.password !== undefined &&
      body.password !== ''
    ) {
      if (
        typeof body.password !== 'string' ||
        body.password.length < 8 ||
        body.password.length > 128
      ) {
        return fail(res, 400, 'Password must be 8 to 128 characters');
      }

      admin.password = body.password;
    }

    // Company name
    if (body.companyName !== undefined) {
      if (
        typeof body.companyName !== 'string' ||
        !body.companyName.trim() ||
        body.companyName.trim().length > 120
      ) {
        return fail(res, 400, 'Invalid company name');
      }

      company.name = body.companyName.trim();
    }

    // Company email
    if (body.ownerEmail !== undefined) {
      if (
        typeof body.ownerEmail !== 'string' ||
        !EMAIL_REGEX.test(body.ownerEmail.trim())
      ) {
        return fail(res, 400, 'Invalid company email');
      }

      company.ownerEmail = body.ownerEmail.trim().toLowerCase();
    }

    // Change assigned subscription package.
    if (body.masterPackageId !== undefined) {
      const selectedPackage = await resolvePackage(
        body.masterPackageId
      );

      if (!selectedPackage) {
        return fail(
          res,
          400,
          'Please select a valid active subscription package'
        );
      }

      company.masterPackageId = selectedPackage._id;
      company.plan = selectedPackage.name.trim().toLowerCase();
    }

    // Save changes.
    await admin.save();
    await company.save();

    return res.json({
      success: true,
      message: 'Company and administrator updated successfully',
      company: {
        _id: company._id,
        name: company.name,
        ownerEmail: company.ownerEmail,
        plan: company.plan,
        masterPackageId: company.masterPackageId,
        isActive: company.isActive,
      },
    });
  } catch (error) {
    console.error('Edit admin:', error);

    return fail(
      res,
      error.code === 11000 ? 409 : 500,
      error.code === 11000
        ? 'Duplicate value'
        : 'Failed to update administrator'
    );
  }
});

// ======================================================
// DELETE ADMINISTRATOR AND COMPANY
// DELETE /api/master/admins/:id
// Requires MongoDB transaction support.
// ======================================================

router.delete('/admins/:id', async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return fail(res, 400, 'Invalid administrator ID');
  }

  let session;

  try {
    session = await mongoose.startSession();
    let deletedCompanyId = null;

    await session.withTransaction(async () => {
      const admin = await User.findOne({
        _id: id,
        role: 'admin',
        tenantId: { $ne: null },
      }).session(session);

      if (!admin) {
        const error = new Error('Administrator not found');
        error.status = 404;
        throw error;
      }

      const company = await Tenant.findById(
        admin.tenantId
      ).session(session);

      if (!company) {
        const error = new Error('Linked company not found');
        error.status = 404;
        throw error;
      }

      deletedCompanyId = company._id;

      const masterCount = await User.countDocuments({
        tenantId: company._id,
        role: 'superadmin',
      }).session(session);

      if (masterCount > 0) {
        const error = new Error(
          'Cannot delete a company linked to a Master account'
        );
        error.status = 409;
        throw error;
      }

      await User.deleteMany({
        tenantId: company._id,
        role: { $ne: 'superadmin' },
      }).session(session);

      const result = await Tenant.deleteOne({
        _id: company._id,
      }).session(session);

      if (result.deletedCount !== 1) {
        throw new Error('Company deletion failed');
      }
    });

    return res.json({
      success: true,
      message: 'Administrator and company deleted successfully',
      companyId: deletedCompanyId,
    });
  } catch (error) {
    console.error('Delete administrator and company:', error);

    const unsupported =
      /Transaction numbers are only allowed|replica set|mongos|does not support transactions/i.test(
        error.message || ''
      );

    return fail(
      res,
      error.status || (unsupported ? 503 : 500),
      unsupported
        ? 'MongoDB transactions require a replica set. Nothing was deleted.'
        : error.status
          ? error.message
          : 'Failed to delete administrator and company'
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

// ======================================================
// DELETE COMPANY WITHOUT ADMINISTRATOR
// DELETE /api/master/companies/:id
// Requires MongoDB transaction support.
// ======================================================

router.delete('/companies/:id', async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return fail(res, 400, 'Invalid company ID');
  }

  let session;

  try {
    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const company = await Tenant.findById(id).session(session);

      if (!company) {
        const error = new Error('Company not found');
        error.status = 404;
        throw error;
      }

      const adminCount = await User.countDocuments({
        tenantId: company._id,
        role: 'admin',
      }).session(session);

      if (adminCount > 0) {
        const error = new Error(
          'This company has an administrator. Delete its administrator instead.'
        );
        error.status = 409;
        throw error;
      }

      const masterCount = await User.countDocuments({
        tenantId: company._id,
        role: 'superadmin',
      }).session(session);

      if (masterCount > 0) {
        const error = new Error(
          'Cannot delete a company linked to a Master account'
        );
        error.status = 409;
        throw error;
      }

      await User.deleteMany({
        tenantId: company._id,
        role: { $ne: 'superadmin' },
      }).session(session);

      const result = await Tenant.deleteOne({
        _id: company._id,
      }).session(session);

      if (result.deletedCount !== 1) {
        throw new Error('Company deletion failed');
      }
    });

    return res.json({
      success: true,
      message: 'Orphaned company deleted successfully',
      companyId: id,
    });
  } catch (error) {
    console.error('Delete orphaned company:', error);

    const unsupported =
      /Transaction numbers are only allowed|replica set|mongos|does not support transactions/i.test(
        error.message || ''
      );

    return fail(
      res,
      error.status || (unsupported ? 503 : 500),
      unsupported
        ? 'MongoDB transactions require a replica set. Nothing was deleted.'
        : error.status
          ? error.message
          : 'Failed to delete orphaned company'
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

module.exports = router;
