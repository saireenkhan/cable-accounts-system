const fs = require('fs');
const csv = require('csv-parser');
const Customer = require('../models/Customer');
const Partner = require('../models/Partner');
const PartnerArea = require('../models/PartnerArea');
const logger = require('../utils/logger');

// ============================================================
// SHARED CONFIG
// ============================================================
const REQUIRED_HEADERS = ['customerId', 'name', 'phone', 'address'];
const OPTIONAL_HEADERS = [
  'package',
  'discount',
  'monthlyFee',
  'status',
  'activationDate',
];

const DEFAULTS = {
  package: '',
  discount: 0,
  monthlyFee: 0,
  status: 'active',
  activationDate: null,
};

const VALID_STATUSES = ['active', 'inactive', 'suspended', 'expired'];

// ============================================================
// SHARED HELPERS
// ============================================================

const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = null;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (h) => {
        headers = h.map((x) =>
          String(x)
            .replace(/^\uFEFF/, '')
            .replace(/^\s+|\s+$/g, '')
        );
      })
      .on('data', (data) => {
        const cleaned = {};
        Object.keys(data).forEach((key) => {
          const cleanKey = String(key)
            .replace(/^\uFEFF/, '')
            .replace(/^\s+|\s+$/g, '');
          cleaned[cleanKey] = data[key];
        });
        rows.push(cleaned);
      })
      .on('end', () => resolve({ headers, rows }))
      .on('error', reject);
  });
};

const validateHeaders = (headers) => {
  if (!headers || headers.length === 0) {
    return { ok: false, message: 'CSV file has no header row' };
  }

  const missingRequired = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missingRequired.length > 0) {
    return {
      ok: false,
      message: `Missing required columns: ${missingRequired.join(
        ', '
      )}. Expected at least: ${REQUIRED_HEADERS.join(',')}`,
    };
  }

  const allowed = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];
  const unknown = headers.filter((h) => !allowed.includes(h));
  if (unknown.length > 0) {
    return {
      ok: false,
      message: `Unknown columns: ${unknown.join(
        ', '
      )}. Allowed: ${allowed.join(',')}`,
    };
  }

  const firstRequired = headers.slice(0, REQUIRED_HEADERS.length);
  const orderOk = REQUIRED_HEADERS.every((h, i) => firstRequired[i] === h);
  if (!orderOk) {
    return {
      ok: false,
      message: `Required columns must be in this order: ${REQUIRED_HEADERS.join(
        ','
      )}. Got: ${firstRequired.join(',')}`,
    };
  }

  return { ok: true };
};

const parseNumber = (val, fallback = 0) => {
  if (val === undefined || val === null || val === '') return fallback;
  const n = parseFloat(
    String(val)
      .replace(/,/g, '')
      .replace(/Rs\.?/i, '')
      .trim()
  );
  return isNaN(n) ? fallback : n;
};

const parseDate = (val) => {
  if (val === undefined || val === null || String(val).trim() === '') {
    return null;
  }
  const d = new Date(String(val).trim());
  return isNaN(d.getTime()) ? null : d;
};

const addOneMonth = (date) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d;
};

const normalizePhone = (phone) => {
  let p = String(phone || '').trim();
  if (/^[1-9]\d{9}$/.test(p)) {
    p = '0' + p;
  }
  return p;
};

const cleanupFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error('Failed to delete temp file:', e.message);
    }
  }
};

// ============================================================
// CUSTOMER BULK UPLOAD
// POST /api/customers/bulk-upload
// ============================================================
exports.bulkUpload = async (req, res) => {
  const filePath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const selectedArea = String(req.body.area || '').trim();
    if (!selectedArea) {
      return res.status(400).json({
        success: false,
        message: 'Please select an area before uploading',
      });
    }

    const { headers, rows } = await parseCSV(filePath);

    console.log('📋 Customer CSV headers:', headers);
    console.log('📊 Customer CSV rows:', rows.length);
    console.log('📍 Target area:', selectedArea);

    const headerCheck = validateHeaders(headers);
    if (!headerCheck.ok) {
      return res.status(400).json({
        success: false,
        message: headerCheck.message,
      });
    }

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'CSV file has no data rows',
      });
    }

    const inserted = [];
    const skipped = [];
    const errors = [];

    const existingIds = new Set();
    const existingDocs = await Customer.find({}, { customerId: 1 }).lean();
    existingDocs.forEach((d) =>
      existingIds.add(String(d.customerId).trim())
    );

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const missing = REQUIRED_HEADERS.filter(
          (h) => row[h] === undefined || String(row[h]).trim() === ''
        );
        if (missing.length > 0) {
          errors.push(`Row ${rowNum}: missing ${missing.join(', ')}`);
          skipped.push(rowNum);
          continue;
        }

        const customerId = String(row.customerId).trim();

        if (existingIds.has(customerId)) {
          errors.push(
            `Row ${rowNum}: customerId "${customerId}" already exists`
          );
          skipped.push(rowNum);
          continue;
        }

        const pkg =
          row.package !== undefined
            ? String(row.package).trim()
            : DEFAULTS.package;
        const discount = parseNumber(row.discount, DEFAULTS.discount);
        const monthlyFee = parseNumber(row.monthlyFee, DEFAULTS.monthlyFee);
        let status =
          row.status !== undefined
            ? String(row.status).trim().toLowerCase()
            : DEFAULTS.status;

        if (!VALID_STATUSES.includes(status)) {
          status = DEFAULTS.status;
        }

        const parsedActivation = parseDate(row.activationDate);
        const activationDate = parsedActivation || new Date();

        if (
          row.activationDate !== undefined &&
          String(row.activationDate).trim() !== '' &&
          !parsedActivation
        ) {
          errors.push(
            `Row ${rowNum}: invalid activationDate "${row.activationDate}" (expected YYYY-MM-DD)`
          );
          skipped.push(rowNum);
          continue;
        }

        const expiryDate = addOneMonth(activationDate);

        const doc = {
          customerId,
          name: String(row.name).trim(),
          phone: normalizePhone(row.phone),
          address: String(row.address).trim(),
          area: selectedArea,
          package: pkg,
          discount: Math.max(0, discount),
          monthlyFee: Math.max(0, monthlyFee),
          status,
          activationDate,
          expiryDate,
        };

        await Customer.create(doc);
        inserted.push(customerId);
        existingIds.add(customerId);
      } catch (err) {
        errors.push(`Row ${rowNum}: ${err.message}`);
        skipped.push(rowNum);
      }
    }

    console.log(`\n📊 Customer bulk upload summary:`);
    console.log(`   Area:       "${selectedArea}"`);
    console.log(`   Total rows: ${rows.length}`);
    console.log(`   Inserted:   ${inserted.length}`);
    console.log(`   Skipped:    ${skipped.length}`);

    res.json({
      success: true,
      area: selectedArea,
      total: rows.length,
      inserted: inserted.length,
      skipped: skipped.length,
      insertedIds: inserted.slice(0, 100),
      errors: errors.slice(0, 100),
      message: `Imported ${inserted.length} of ${rows.length} customers into "${selectedArea}". ${skipped.length} skipped.`,
    });
  } catch (error) {
    logger.error(`Customer bulk upload error: ${error.message}`);
    console.error('❌ Customer bulk upload error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Server error during bulk upload',
    });
  } finally {
    cleanupFile(filePath);
  }
};

// ============================================================
// PARTNER BULK UPLOAD
// POST /api/partners/bulk-upload
// ============================================================
exports.bulkUploadPartners = async (req, res) => {
  const filePath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const selectedArea = String(req.body.area || '').trim();
    if (!selectedArea) {
      return res.status(400).json({
        success: false,
        message: 'Please select a partner area before uploading',
      });
    }

    // Verify partner area exists
    const areaDoc = await PartnerArea.findOne({ name: selectedArea });
    if (!areaDoc) {
      return res.status(400).json({
        success: false,
        message: `Partner area "${selectedArea}" not found. Please create it first.`,
      });
    }

    const { headers, rows } = await parseCSV(filePath);

    console.log('📋 Partner CSV headers:', headers);
    console.log('📊 Partner CSV rows:', rows.length);
    console.log('📍 Target partner area:', selectedArea);

    const headerCheck = validateHeaders(headers);
    if (!headerCheck.ok) {
      return res.status(400).json({
        success: false,
        message: headerCheck.message,
      });
    }

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'CSV file has no data rows',
      });
    }

    const inserted = [];
    const skipped = [];
    const errors = [];
    const duplicateIds = [];

// ✅ Check BOTH collections for global uniqueness
const existingIds = new Set();

const [existingPartnerDocs, existingCustomerDocs] = await Promise.all([
  Partner.find({}, { partnerId: 1 }).lean(),
  Customer.find({}, { customerId: 1 }).lean(),
]);

existingPartnerDocs.forEach((d) =>
  existingIds.add(String(d.partnerId).trim().toUpperCase())
);

existingCustomerDocs.forEach((d) => {
  const cid = String(d.customerId).trim().toUpperCase();
  if (cid) existingIds.add(cid);
});

// Keep a set of customer IDs to distinguish the conflict type later
const customerIdSet = new Set(
  existingCustomerDocs
    .map((d) => String(d.customerId).trim().toUpperCase())
    .filter(Boolean)
);

const seenInFile = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const missing = REQUIRED_HEADERS.filter(
          (h) => row[h] === undefined || String(row[h]).trim() === ''
        );
        if (missing.length > 0) {
          errors.push(`Row ${rowNum}: missing ${missing.join(', ')}`);
          skipped.push(rowNum);
          continue;
        }

        const partnerId = String(row.customerId).trim();
        const partnerIdUpper = partnerId.toUpperCase();

// Duplicate check — already in DB (either collection)
if (existingIds.has(partnerIdUpper)) {
  const conflictType = customerIdSet.has(partnerIdUpper)
    ? 'Customer'
    : 'Partner';

  duplicateIds.push(partnerId);
  errors.push(
    `Row ${rowNum}: ID "${partnerId}" already exists as a ${conflictType}`
  );
  skipped.push(rowNum);
  continue;
}

        if (seenInFile.has(partnerIdUpper)) {
          duplicateIds.push(partnerId);
          errors.push(
            `Row ${rowNum}: Partner ID "${partnerId}" appears multiple times in this CSV`
          );
          skipped.push(rowNum);
          continue;
        }

        const pkg =
          row.package !== undefined
            ? String(row.package).trim()
            : DEFAULTS.package;
        const discount = parseNumber(row.discount, DEFAULTS.discount);
        const monthlyFee = parseNumber(row.monthlyFee, DEFAULTS.monthlyFee);
        let status =
          row.status !== undefined
            ? String(row.status).trim().toLowerCase()
            : DEFAULTS.status;

        if (!VALID_STATUSES.includes(status)) {
          status = DEFAULTS.status;
        }

        const parsedActivation = parseDate(row.activationDate);
        const activationDate = parsedActivation || new Date();

        if (
          row.activationDate !== undefined &&
          String(row.activationDate).trim() !== '' &&
          !parsedActivation
        ) {
          errors.push(
            `Row ${rowNum}: invalid activationDate "${row.activationDate}" (expected YYYY-MM-DD)`
          );
          skipped.push(rowNum);
          continue;
        }

        const expiryDate = addOneMonth(activationDate);

        const doc = {
          partnerId,
          name: String(row.name).trim(),
          phone: normalizePhone(row.phone),
          address: String(row.address).trim(),
          area: selectedArea,
          package: pkg,
          discount: Math.max(0, discount),
          monthlyFee: Math.max(0, monthlyFee),
          status,
          activationDate,
          expiryDate,
        };

        await Partner.create(doc);
        inserted.push(partnerId);
        existingIds.add(partnerIdUpper);
        seenInFile.add(partnerIdUpper);
      } catch (err) {
        if (err.code === 11000) {
          const pid = String(row.customerId || '').trim();
          if (pid) duplicateIds.push(pid);
          errors.push(
            `Row ${rowNum}: Partner ID "${row.customerId}" already exists`
          );
        } else {
          errors.push(`Row ${rowNum}: ${err.message}`);
        }
        skipped.push(rowNum);
      }
    }

    console.log(`\n📊 Partner bulk upload summary:`);
    console.log(`   Area:       "${selectedArea}"`);
    console.log(`   Total rows: ${rows.length}`);
    console.log(`   Inserted:   ${inserted.length}`);
    console.log(`   Skipped:    ${skipped.length}`);
    console.log(`   Duplicates: ${duplicateIds.length}`);

    res.json({
      success: true,
      area: selectedArea,
      total: rows.length,
      inserted: inserted.length,
      skipped: skipped.length,
      insertedIds: inserted.slice(0, 100),
      duplicateIds: Array.from(new Set(duplicateIds)).slice(0, 100),
      errors: errors.slice(0, 100),
      message: `Imported ${inserted.length} of ${rows.length} partners into "${selectedArea}". ${skipped.length} skipped.`,
    });
  } catch (error) {
    logger.error(`Partner bulk upload error: ${error.message}`);
    console.error('❌ Partner bulk upload error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Server error during partner bulk upload',
    });
  } finally {
    cleanupFile(filePath);
  }
};

// ============================================================
// CUSTOMER SAMPLE CSV
// GET /api/customers/bulk-upload/sample
// ============================================================
exports.downloadSample = (req, res) => {
  const formatDate = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const lines = [
    'customerId,name,phone,address,package,discount,monthlyFee,status,activationDate',
    `USR-001,John Doe,0300-1234567,"House 5, Street 3",BASIC,0,1500,active,${formatDate(today)}`,
    `USR-002,Jane Smith,0321-9876543,"Flat B-12, Block 1",PREMIUM,500,3500,active,${formatDate(tomorrow)}`,
    `USR-003,Ahmed Khan,0333-5555555,"Shop 12, Main Market",STANDARD,0,2500,active,${formatDate(dayAfter)}`,
  ];

  const sampleCSV = lines.join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="customer-import-sample.csv"'
  );

  res.send('\uFEFF' + sampleCSV);
};

// ============================================================
// PARTNER SAMPLE CSV
// GET /api/partners/bulk-upload/sample
// ============================================================
exports.downloadPartnerSample = (req, res) => {
  const formatDate = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const lines = [
    'customerId,name,phone,address,package,discount,monthlyFee,status,activationDate',
    `PTR-001,John Doe,0300-1234567,"House 5, Street 3",BASIC,0,1500,active,${formatDate(today)}`,
    `PTR-002,Jane Smith,0321-9876543,"Flat B-12, Block 1",PREMIUM,500,3500,active,${formatDate(tomorrow)}`,
    `PTR-003,Ahmed Khan,0333-5555555,"Shop 12, Main Market",STANDARD,0,2500,active,${formatDate(dayAfter)}`,
  ];

  const sampleCSV = lines.join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="partner-import-sample.csv"'
  );

  res.send('\uFEFF' + sampleCSV);
};