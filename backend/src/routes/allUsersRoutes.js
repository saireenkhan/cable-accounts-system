
const express = require('express');
const mongoose = require('mongoose');

const Customer = require('../models/Customer');
const Partner = require('../models/Partner');

const {
  protect,
  requireTenant,
  requirePackagePage,
} = require('../middleware/auth');

const router = express.Router();

// ======================================================
// AUTHENTICATION + PACKAGE PERMISSION
// ======================================================

router.use(
  protect,
  requireTenant,
  requirePackagePage('/all-users')
);

// ======================================================
// HELPERS
// ======================================================

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeArea = (area) => {
  if (!area) return '';

  if (typeof area === 'string') {
    return area;
  }

  if (area.name) {
    return area.name;
  }

  return '';
};

const normalizeCustomer = (customer) => ({
  _id: String(customer._id),
  userType: 'customer',
  displayId: customer.customerId || '',
  name: customer.name || '',
  phone: customer.phone || '',
  cnic: customer.cnic || '',
  isp: customer.isp || '',
  area: normalizeArea(customer.area),
  package: customer.package || '',
  monthlyFee: Number(customer.monthlyFee || 0),
  discount: Number(customer.discount || 0),
  status: customer.status || 'inactive',
  activationDate: customer.activationDate || null,
  expiryDate: customer.expiryDate || null,
  createdAt: customer.createdAt || null,
});

const normalizePartner = (partner) => ({
  _id: String(partner._id),
  userType: 'partner',
  displayId: partner.partnerId || '',
  name: partner.name || '',
  phone: partner.phone || '',
  cnic: partner.cnic || '',
  isp: partner.isp || '',
  area: normalizeArea(partner.area),
  package: partner.package || '',
  monthlyFee: Number(partner.monthlyFee || 0),
  discount: Number(partner.discount || 0),
  status: partner.status || 'inactive',
  activationDate: partner.activationDate || null,
  expiryDate: partner.expiryDate || null,
  createdAt: partner.createdAt || null,
});

// ======================================================
// GET /api/all-users
//
// Query parameters:
// search
// type = all | customer | partner
// status = all | active | inactive | suspended | expired
// page
// limit
// ======================================================

router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!mongoose.isValidObjectId(tenantId)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid company session',
      });
    }

    const search = String(req.query.search || '').trim();

    const type = String(req.query.type || 'all')
      .trim()
      .toLowerCase();

    const status = String(req.query.status || 'all')
      .trim()
      .toLowerCase();

    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(req.query.limit, 10) || 20
      )
    );

    const validTypes = ['all', 'customer', 'partner'];

    const validStatuses = [
      'all',
      'active',
      'inactive',
      'suspended',
      'expired',
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type filter',
      });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status filter',
      });
    }

    // ==================================================
    // BASE TENANT FILTER
    // ==================================================

    const baseFilter = {
      tenantId,
    };

    // ==================================================
    // SEARCH FILTER
    // ==================================================

    const customerFilter = { ...baseFilter };
    const partnerFilter = { ...baseFilter };

    if (status !== 'all') {
      customerFilter.status = status;
      partnerFilter.status = status;
    }

    if (search) {
      // Limit regex input size to prevent expensive searches.
      if (search.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Search must be 100 characters or fewer',
        });
      }

      const regex = new RegExp(
        escapeRegex(search),
        'i'
      );

      customerFilter.$or = [
        { customerId: regex },
        { name: regex },
        { phone: regex },
        { cnic: regex },
        { isp: regex },
      ];

      partnerFilter.$or = [
        { partnerId: regex },
        { name: regex },
        { phone: regex },
        { cnic: regex },
        { isp: regex },
      ];
    }

    // ==================================================
    // FETCH CUSTOMERS + PARTNERS
    // ==================================================

    const fetchCustomers = type !== 'partner';
    const fetchPartners = type !== 'customer';

    const [
      customers,
      partners,
      totalCustomers,
      totalPartners,
      totalActiveCustomers,
      totalActivePartners,
    ] = await Promise.all([
      fetchCustomers
        ? Customer.find(customerFilter)
            .populate('area', 'name')
            .lean()
        : Promise.resolve([]),

      fetchPartners
        ? Partner.find(partnerFilter).lean()
        : Promise.resolve([]),

      Customer.countDocuments(baseFilter),

      Partner.countDocuments(baseFilter),

      Customer.countDocuments({
        ...baseFilter,
        status: 'active',
      }),

      Partner.countDocuments({
        ...baseFilter,
        status: 'active',
      }),
    ]);

    // ==================================================
    // NORMALIZE AND COMBINE
    // ==================================================

    const allUsers = [
      ...customers.map(normalizeCustomer),
      ...partners.map(normalizePartner),
    ];

    // Newest first
    allUsers.sort((a, b) => {
      const dateA = a.createdAt
        ? new Date(a.createdAt).getTime()
        : 0;

      const dateB = b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;

      return dateB - dateA;
    });

    // ==================================================
    // PAGINATION
    // ==================================================

    const total = allUsers.length;

    const totalPages = Math.max(
      1,
      Math.ceil(total / limit)
    );

    const startIndex = (page - 1) * limit;

    const paginatedUsers = allUsers.slice(
      startIndex,
      startIndex + limit
    );

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.status(200).json({
      success: true,

      users: paginatedUsers,

      total,

      totalCustomers,

      totalPartners,

      totalActive:
        totalActiveCustomers + totalActivePartners,

      page,

      limit,

      totalPages,

      filters: {
        search,
        type,
        status,
      },
    });
  } catch (error) {
    console.error('All Users API Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch all users',
    });
  }
});

module.exports = router;
