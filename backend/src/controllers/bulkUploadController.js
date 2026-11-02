
'use strict';

const csv = require('csv-parser');
const { Readable } = require('stream');
const mongoose = require('mongoose');

const Customer = require('../models/Customer');
const Partner = require('../models/Partner');
const PartnerArea = require('../models/PartnerArea');
const Area = require('../models/Area');
const resolveUploadArea = require('../utils/resolveUploadArea');
const logger = require('../utils/logger');

// ============================================================
// SECURITY CONFIGURATION
// ============================================================

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 10000;
const MAX_CELL_BYTES = 2048;

const REQUIRED_HEADERS = [
  'customerId',
  'name',
  'phone',
  'address',
];

const OPTIONAL_HEADERS = [
  'package',
  'discount',
  'monthlyFee',
  'status',
  'activationDate',
];

const ALLOWED_HEADERS = [
  ...REQUIRED_HEADERS,
  ...OPTIONAL_HEADERS,
];

const VALID_STATUSES = new Set([
  'active',
  'inactive',
  'suspended',
  'expired',
]);

const normalizeKey = (value) =>
  String(value || '').trim().toUpperCase();

const badControls =
  /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

// ============================================================
// ERROR HANDLING
// ============================================================

class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'InputError';
    this.status = status;
  }
}

function rowError(error) {
  if (error && error.code === 11000) {
    return 'ID already exists';
  }

  if (error instanceof InputError) {
    return error.message;
  }

  if (error && error.name === 'ValidationError') {
    return 'Record failed model validation';
  }

  return 'Could not save record';
}

function handleError(res, error, context) {
  if (error instanceof InputError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
    });
  }

  logger.error(
    `${context}: ${
      error && error.message
        ? error.message
        : 'Unknown error'
    }`
  );

  return res.status(500).json({
    success: false,
    message: 'Server error during bulk upload',
  });
}

// ============================================================
// INPUT VALIDATION
// ============================================================

function textField(value, label, max, required = true) {
  if (typeof value !== 'string') {
    throw new InputError(`${label} must be text`);
  }

  const text = value.trim();

  if (
    (required && !text) ||
    text.length > max ||
    badControls.test(text)
  ) {
    throw new InputError(
      `Invalid ${label} (maximum ${max} characters)`
    );
  }

  return text;
}

function requestField(req, key, required = true) {
  const value = req.body && req.body[key];

  if (value == null && !required) {
    return '';
  }

  return textField(value, key, 150, required);
}

function tenantFromRequest(req) {
  if (
    !req.tenantId ||
    !mongoose.isValidObjectId(req.tenantId)
  ) {
    throw new InputError(
      'Tenant not found. Please log in again.',
      403
    );
  }

  return req.tenantId;
}

// ============================================================
// FINANCIAL VALIDATION
// ============================================================

function parseMoney(value, label) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ''
  ) {
    return 0;
  }

  const raw = String(value)
    .trim()
    .replace(/,/g, '')
    .replace(/^Rs\.?\s*/i, '');

  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new InputError(`Invalid ${label}`);
  }

  const number = Number(raw);

  if (
    !Number.isFinite(number) ||
    number > 10000000
  ) {
    throw new InputError(
      `${label} exceeds allowed range`
    );
  }

  return number;
}

// ============================================================
// DATE VALIDATION
// ============================================================

function parseDate(value) {
  if (
    value == null ||
    String(value).trim() === ''
  ) {
    return null;
  }

  const raw = String(value).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new InputError(
      'Invalid activationDate (expected YYYY-MM-DD)'
    );
  }

  const date = new Date(
    `${raw}T00:00:00.000Z`
  );

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== raw
  ) {
    throw new InputError(
      'Invalid activationDate (expected YYYY-MM-DD)'
    );
  }

  return date;
}

function addOneMonth(date) {
  // Preserves your existing expiry-date logic.
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d;
}

// ============================================================
// PHONE VALIDATION
// ============================================================

function normalizePhone(value) {
  let phone = textField(
    value,
    'phone',
    30
  );

  if (/^[1-9]\d{9}$/.test(phone)) {
    phone = `0${phone}`;
  }

  if (!/^[0-9+()\s-]{7,30}$/.test(phone)) {
    throw new InputError('Invalid phone');
  }

  return phone;
}

// ============================================================
// CSV HEADER VALIDATION
// ============================================================

function validateHeaders(headers) {
  if (!headers || !headers.length) {
    throw new InputError(
      'CSV file has no header row'
    );
  }

  const normalized = headers.map((header) =>
    String(header)
      .replace(/^\uFEFF/, '')
      .trim()
  );

  if (
    new Set(normalized).size !==
    normalized.length
  ) {
    throw new InputError(
      'CSV contains duplicate column names'
    );
  }

  const missing = REQUIRED_HEADERS.filter(
    (header) => !normalized.includes(header)
  );

  if (missing.length) {
    throw new InputError(
      `Missing required columns: ${missing.join(', ')}`
    );
  }

  const unknown = normalized.filter(
    (header) => !ALLOWED_HEADERS.includes(header)
  );

  if (unknown.length) {
    throw new InputError(
      `Unknown columns: ${unknown.join(', ')}`
    );
  }

  const validOrder = REQUIRED_HEADERS.every(
    (header, index) => normalized[index] === header
  );

  if (!validOrder) {
    throw new InputError(
      `Required columns must be in this order: ${
        REQUIRED_HEADERS.join(',')
      }`
    );
  }

  return normalized;
}

// ============================================================
// CSV FILE VALIDATION
// ============================================================

function validateFile(req) {
  if (!req.file) {
    throw new InputError('No file uploaded');
  }

  if (!Buffer.isBuffer(req.file.buffer)) {
    throw new InputError(
      'CSV upload must use memory storage'
    );
  }

  if (!req.file.buffer.length) {
    throw new InputError('CSV file is empty');
  }

  if (req.file.buffer.length > MAX_FILE_BYTES) {
    throw new InputError(
      'CSV file exceeds 10 MB',
      413
    );
  }

  if (
    req.file.originalname &&
    !/\.csv$/i.test(req.file.originalname)
  ) {
    throw new InputError(
      'Only .csv files are allowed'
    );
  }

  if (req.file.buffer.includes(0)) {
    throw new InputError(
      'Invalid CSV file content'
    );
  }
}

// ============================================================
// SECURE CSV PARSER
// ============================================================

function parseCSVFromBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers;
    let settled = false;

    const source = Readable.from([buffer]);

    const parser = csv({
      strict: true,
      maxRowBytes: 64 * 1024,
      mapHeaders: ({ header }) =>
        String(header)
          .replace(/^\uFEFF/, '')
          .trim(),
    });

    const fail = (error) => {
      if (settled) return;

      settled = true;

      source.unpipe(parser);
      source.destroy();
      parser.destroy();

      reject(
        error instanceof InputError
          ? error
          : new InputError(
              'Malformed or invalid CSV file'
            )
      );
    };

    parser.on('headers', (receivedHeaders) => {
      try {
        headers = validateHeaders(receivedHeaders);
      } catch (error) {
        fail(error);
      }
    });

    parser.on('data', (row) => {
      if (settled) return;

      if (rows.length >= MAX_ROWS) {
        return fail(
          new InputError(
            `CSV exceeds ${MAX_ROWS} rows`
          )
        );
      }

      for (const [key, value] of Object.entries(row)) {
        if (
          !headers ||
          !headers.includes(key) ||
          typeof value !== 'string' ||
          Buffer.byteLength(value, 'utf8') >
            MAX_CELL_BYTES
        ) {
          return fail(
            new InputError(
              'Invalid CSV column or oversized cell'
            )
          );
        }
      }

      rows.push(row);
    });

    parser.on('error', fail);
    source.on('error', fail);

    parser.on('end', () => {
      if (settled) return;

      settled = true;

      if (!rows.length) {
        return reject(
          new InputError(
            'CSV file has no data rows'
          )
        );
      }

      resolve({
        headers,
        rows,
      });
    });

    source.pipe(parser);
  });
}

// ============================================================
// CUSTOMER / PARTNER ROW VALIDATION
// ============================================================

function buildFields(row) {
  const customerId = textField(
    row.customerId,
    'customerId',
    50
  );

  if (!/^[a-zA-Z0-9_-]+$/.test(customerId)) {
    throw new InputError(
      'Invalid customerId characters'
    );
  }

  const name = textField(
    row.name,
    'name',
    120
  );

  const phone = normalizePhone(row.phone);

  const address = textField(
    row.address,
    'address',
    500
  );

  const pkg = textField(
    row.package === undefined
      ? ''
      : row.package,
    'package',
    150,
    false
  );

  const discount = parseMoney(
    row.discount,
    'discount'
  );

  const monthlyFee = parseMoney(
    row.monthlyFee,
    'monthlyFee'
  );

  const status =
    row.status === undefined ||
    row.status.trim() === ''
      ? 'active'
      : textField(
          row.status,
          'status',
          20
        ).toLowerCase();

  if (!VALID_STATUSES.has(status)) {
    throw new InputError(
      'Invalid status'
    );
  }

  const activationDate =
    parseDate(row.activationDate) ||
    new Date();

  return {
    customerId,
    name,
    phone,
    address,
    package: pkg,
    discount,
    monthlyFee,
    status,
    activationDate,
    expiryDate: addOneMonth(activationDate),
  };
}

// ============================================================
// CUSTOMER AND PARTNER BULK UPLOAD
// ============================================================

async function upload(req, res, partnerMode) {
  try {
    const tenantId = tenantFromRequest(req);

    validateFile(req);

    const selectedArea = requestField(
      req,
      'area'
    );

    const selectedPartner = partnerMode
      ? requestField(req, 'partner')
      : null;

    // Preserve existing ISP / Area resolution.
    const uploadContext = await resolveUploadArea(
      req,
      partnerMode ? PartnerArea : Area
    );

    if (!uploadContext.ok) {
      throw new InputError(
        uploadContext.message ||
        'Invalid area or ISP'
      );
    }

    const isp = uploadContext.ispEnabled
      ? textField(
          uploadContext.ispName,
          'ISP',
          100
        )
      : '';

    const { rows } = await parseCSVFromBuffer(
      req.file.buffer
    );

    const inserted = [];
    const skipped = [];
    const errors = [];
    const duplicateIds = [];

    const existingIds = new Set();
    const existingCustomerIds = new Set();
    const seenInFile = new Set();

    const ispKey = normalizeKey(isp);

    // ========================================================
    // DUPLICATE DETECTION
    // ========================================================

    if (partnerMode) {
      // Original partner behavior:
      // reject IDs already used by customers or partners
      // within the same tenant.

      const [partners, customers] =
        await Promise.all([
          Partner.find(
            { tenantId },
            { partnerId: 1 }
          ).lean(),

          Customer.find(
            { tenantId },
            { customerId: 1 }
          ).lean(),
        ]);

      for (const doc of partners) {
        existingIds.add(
          normalizeKey(doc.partnerId)
        );
      }

      for (const doc of customers) {
        const key = normalizeKey(
          doc.customerId
        );

        if (key) {
          existingIds.add(key);
          existingCustomerIds.add(key);
        }
      }
    } else {
      // Customer uniqueness:
      // tenant + ISP + normalized customer ID.

      const customers = await Customer.find(
        {
          tenantId,
          ispKey,
        },
        {
          customerId: 1,
          customerIdKey: 1,
        }
      )
        .select('+customerIdKey')
        .lean();

      for (const doc of customers) {
        existingIds.add(
          normalizeKey(
            doc.customerIdKey ||
            doc.customerId
          )
        );
      }
    }

    // ========================================================
    // IMPORT ROWS
    // ========================================================

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      let displayId = '';

      try {
        const fields = buildFields(row);

        displayId = fields.customerId;

        const key = normalizeKey(displayId);

        if (
          existingIds.has(key) ||
          seenInFile.has(key)
        ) {
          if (partnerMode) {
            duplicateIds.push(displayId);
          }

          const type =
            partnerMode &&
            existingCustomerIds.has(key)
              ? 'Customer'
              : partnerMode
                ? 'Partner'
                : 'Customer';

          throw new InputError(
            `ID "${displayId}" already exists${
              partnerMode
                ? ` as a ${type}`
                : ''
            }`
          );
        }

        if (partnerMode) {
          const {
            customerId,
            ...other
          } = fields;

          await Partner.create({
            tenantId,
            partnerId: customerId,
            ...other,
            area: selectedArea,
            ...(uploadContext.ispEnabled
              ? { isp }
              : {}),
            partner: selectedPartner,
          });
        } else {
          await Customer.create({
            tenantId,
            ...fields,
            area: selectedArea,
            ...(uploadContext.ispEnabled
              ? { isp }
              : {}),
          });
        }

        inserted.push(displayId);
        existingIds.add(key);
        seenInFile.add(key);

      } catch (error) {
        if (
          partnerMode &&
          error &&
          error.code === 11000 &&
          displayId
        ) {
          duplicateIds.push(displayId);
        }

        skipped.push(rowNum);

        errors.push(
          `Row ${rowNum}: ${rowError(error)}`
        );
      }
    }

    // ========================================================
    // PRESERVE EXISTING FRONTEND RESPONSE
    // ========================================================

    return res.json({
      success: true,

      area: selectedArea,

      ...(uploadContext.ispEnabled
        ? { isp }
        : {}),

      ...(partnerMode
        ? { partner: selectedPartner }
        : {}),

      total: rows.length,

      inserted: inserted.length,

      skipped: skipped.length,

      insertedIds: inserted.slice(0, 100),

      ...(partnerMode
        ? {
            duplicateIds: [
              ...new Set(duplicateIds),
            ].slice(0, 100),
          }
        : {}),

      errors: errors.slice(0, 100),

      message:
        `Imported ${inserted.length} of ` +
        `${rows.length} ` +
        `${partnerMode ? 'partners' : 'customers'} ` +
        `into "${selectedArea}". ` +
        `${skipped.length} skipped.`,
    });

  } catch (error) {
    return handleError(
      res,
      error,
      partnerMode
        ? 'Partner bulk upload'
        : 'Customer bulk upload'
    );
  }
}

// ============================================================
// EXISTING CONTROLLER EXPORTS
// ============================================================

exports.bulkUpload = (req, res) =>
  upload(req, res, false);

exports.bulkUploadPartners = (req, res) =>
  upload(req, res, true);

// ============================================================
// SAMPLE CSV DOWNLOADS
// ============================================================

function formatDate(date) {
  return (
    `${date.getFullYear()}-` +
    `${String(date.getMonth() + 1).padStart(2, '0')}-` +
    `${String(date.getDate()).padStart(2, '0')}`
  );
}

function sendSample(res, prefix, filename) {
  const today = new Date();

  const lines = [
    'customerId,name,phone,address,package,discount,monthlyFee,status,activationDate',
  ];

  const samples = [
    [
      '001',
      'John Doe',
      '0300-1234567',
      'House 5, Street 3',
      'BASIC',
      0,
      1500,
    ],
    [
      '002',
      'Jane Smith',
      '0321-9876543',
      'Flat B-12, Block 1',
      'PREMIUM',
      500,
      3500,
    ],
    [
      '003',
      'Ahmed Khan',
      '0333-5555555',
      'Shop 12, Main Market',
      'STANDARD',
      0,
      2500,
    ],
  ];

  samples.forEach(
    ([id, name, phone, address, pkg, discount, fee], i) => {
      const date = new Date(today);

      date.setDate(
        date.getDate() + i
      );

      lines.push(
        `${prefix}-${id},${name},${phone},` +
        `"${address}",${pkg},${discount},` +
        `${fee},active,${formatDate(date)}`
      );
    }
  );

  res.setHeader(
    'Content-Type',
    'text/csv; charset=utf-8'
  );

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`
  );

  return res.send(
    '\uFEFF' + lines.join('\r\n')
  );
}

exports.downloadSample = (req, res) =>
  sendSample(
    res,
    'USR',
    'customer-import-sample.csv'
  );

exports.downloadPartnerSample = (req, res) =>
  sendSample(
    res,
    'PTR',
    'partner-import-sample.csv'
  );
