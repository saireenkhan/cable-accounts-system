const fs = require('fs');
const csv = require('csv-parser');
const Customer = require('../models/Customer');
const logger = require('../utils/logger');

// ✅ Required columns (must be at the start, in this exact order)
const REQUIRED_HEADERS = ['customerId', 'name', 'phone', 'address'];

// ✅ Optional columns (any order after the required ones)
const OPTIONAL_HEADERS = ['package', 'discount', 'monthlyFee', 'status'];

// ✅ Default values for missing optional columns
const DEFAULTS = {
  package: '',
  discount: 0,
  monthlyFee: 0,
  status: 'active',
};

const VALID_STATUSES = ['active', 'inactive', 'suspended', 'expired'];

// ============================================================
// Parse a CSV file → { headers, rows }
// ============================================================
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = null;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (h) => {
        // ✅ Strip BOM and trim whitespace from header names
        headers = h.map((x) =>
          String(x)
            .replace(/^\uFEFF/, '')
            .replace(/^\s+|\s+$/g, '')
        );
      })
      .on('data', (data) => {
        // ✅ Also clean up row keys (in case they have BOM/whitespace)
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

// ============================================================
// Validate the CSV header row
// ============================================================
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

  // Required columns must be the first N columns in this exact order
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

// ============================================================
// Parse a numeric value safely
// ============================================================
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

// ============================================================
// Phone normalizer: 10 digits starting with 1-9 → prepend 0
// ============================================================
const normalizePhone = (phone) => {
  let p = String(phone || '').trim();
  if (/^[1-9]\d{9}$/.test(p)) {
    p = '0' + p;
  }
  return p;
};

// ============================================================
// POST /api/customers/bulk-upload
// Multipart form-data with `file` (CSV) and `area` (string)
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

    // ✅ 0. Validate the area from request body
    const selectedArea = String(req.body.area || '').trim();
    if (!selectedArea) {
      return res.status(400).json({
        success: false,
        message: 'Please select an area before uploading',
      });
    }

    // 1. Parse CSV
    const { headers, rows } = await parseCSV(filePath);

    console.log('📋 CSV headers:', headers);
    console.log('📊 CSV rows:', rows.length);
    console.log('📍 Target area:', selectedArea);

    // 2. Validate headers
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

    // 3. Process rows
    const inserted = [];
    const skipped = [];
    const errors = [];

    // Preload existing customerIds for duplicate check
    const existingIds = new Set();
    const existingDocs = await Customer.find({}, { customerId: 1 }).lean();
    existingDocs.forEach((d) =>
      existingIds.add(String(d.customerId).trim())
    );

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // header is row 1

      try {
        // Check required fields have values
        const missing = REQUIRED_HEADERS.filter(
          (h) => row[h] === undefined || String(row[h]).trim() === ''
        );
        if (missing.length > 0) {
          errors.push(`Row ${rowNum}: missing ${missing.join(', ')}`);
          skipped.push(rowNum);
          continue;
        }

        const customerId = String(row.customerId).trim();

        // Duplicate check
        if (existingIds.has(customerId)) {
          errors.push(
            `Row ${rowNum}: customerId "${customerId}" already exists`
          );
          skipped.push(rowNum);
          continue;
        }

        // Optional columns → defaults if missing
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

        // Build document — area comes from request body, not CSV
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
        };

        await Customer.create(doc);
        inserted.push(customerId);
        existingIds.add(customerId);
      } catch (err) {
        errors.push(`Row ${rowNum}: ${err.message}`);
        skipped.push(rowNum);
      }
    }

    // 4. Log summary
    console.log(`\n📊 Bulk upload summary:`);
    console.log(`   Area:       "${selectedArea}"`);
    console.log(`   Total rows: ${rows.length}`);
    console.log(`   Inserted:   ${inserted.length}`);
    console.log(`   Skipped:    ${skipped.length}`);
    if (errors.length > 0) {
      console.log(`   First errors:`);
      errors.slice(0, 5).forEach((e) => console.log(`     - ${e}`));
    }

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
    logger.error(`Bulk upload error: ${error.message}`);
    console.error('❌ Bulk upload error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Server error during bulk upload',
    });
  } finally {
    // Clean up uploaded file
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to delete temp file:', e.message);
      }
    }
  }
};

// ============================================================
// GET /api/customers/bulk-upload/sample
// Returns a sample CSV template (no area column)
// ============================================================
exports.downloadSample = (req, res) => {
  const sampleCSV = [
    'customerId,name,phone,address,package,discount,monthlyFee,status',
    'USR-001,John Doe,0300-1234567,"House 5, Street 3",BASIC,0,1500,active',
    'USR-002,Jane Smith,0321-9876543,"Flat B-12, Block 1",PREMIUM,500,3500,active',
    'USR-003,Ahmed Khan,0333-5555555,"Shop 12, Main Market",STANDARD,0,2500,active',
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="customer-import-sample.csv"'
  );
  res.send('\uFEFF' + sampleCSV);
};