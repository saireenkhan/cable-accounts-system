/**
 * apply-tenant-id.js
 *
 * Adds a `tenantId` field to all data model schemas and updates unique
 * indexes to be per-tenant.
 *
 * Safe: backs up every file to backend/scripts/models-backup/ before editing.
 * Idempotent: skips files that already have a tenantId field.
 *
 * Usage:
 *   cd backend
 *   node scripts/apply-tenant-id.js
 *   node scripts/apply-tenant-id.js --dry-run    # preview only
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const MODELS_DIR = path.join(__dirname, '..', '..', 'src', 'models');
const BACKUP_DIR = path.join(__dirname, 'models-backup');

// Files we will process. Order doesn't matter.
const MODELS = [
  'Area.js',
  'Attendance.js',
  'Bill.js',
  'Customer.js',
  'Dealer.js',
  'DealerArea.js',
  'DealerPayment.js',
  'Expense.js',
  'InstallationCharge.js',
  'Package.js',
  'Partner.js',
  'PartnerArea.js',
  'PartnerList.js',
  'PartnerPayment.js',
  'Payment.js',
  'Purchase.js',
  'Staff.js',
  'WhatsAppConfig.js',
  'WhatsAppMessage.js',
  'WhatsAppSession.js',
];

// The ID field on each model that needs a compound unique index with tenantId.
// If a model has no unique field, leave null.
const UNIQUE_FIELDS = {
  'Area.js': 'name',
  'Attendance.js': null,
  'Bill.js': null,
  'Customer.js': 'customerId',
  'Dealer.js': 'dealerId',
  'DealerArea.js': 'name',
  'DealerPayment.js': null,
  'Expense.js': null,
  'InstallationCharge.js': null,
  'Package.js': 'name',
  'Partner.js': 'partnerId',
  'PartnerArea.js': 'name',
  'PartnerList.js': 'partnerId',
  'PartnerPayment.js': null,
  'Payment.js': null,
  'Purchase.js': null,
  'Staff.js': 'staffId',
  'WhatsAppConfig.js': null,
  'WhatsAppMessage.js': null,
  'WhatsAppSession.js': null,
};

// ------------------- helpers -------------------

function backupFile(filePath) {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  const dest = path.join(BACKUP_DIR, path.basename(filePath));
  fs.copyFileSync(filePath, dest);
}

function addTenantIdField(content) {
  // If already present, skip.
  if (/\btenantId\s*:/.test(content)) return { content, changed: false };

  // Match the opening of the schema:
  // const <name>Schema = new mongoose.Schema({
  // and then the first field. We'll insert tenantId right after the opening brace.
  const schemaStartRegex = /new\s+mongoose\.Schema\(\s*\{\s*\n/;
  const m = content.match(schemaStartRegex);
  if (!m) return { content, changed: false };

  const insertAfter = m.index + m[0].length;

  const tenantIdBlock =
    `  tenantId: {\n` +
    `    type: mongoose.Schema.Types.ObjectId,\n` +
    `    ref: 'Tenant',\n` +
    `    required: false,\n` +
    `    index: true,\n` +
    `  },\n`;

  const updated =
    content.slice(0, insertAfter) + tenantIdBlock + content.slice(insertAfter);
  return { content: updated, changed: true };
}

function removeUniqueFromField(content, fieldName) {
  if (!fieldName) return { content, changed: false };

  // Match: <fieldName>: { ... unique: true ... }
  // We remove the "unique: true," line.
  const fieldRegex = new RegExp(
    `(${fieldName}\\s*:\\s*\\{[^}]*?)unique\\s*:\\s*true\\s*,?\\s*`,
    's'
  );
  const before = content;
  const updated = content.replace(fieldRegex, '$1');
  return { content: updated, changed: updated !== before };
}

function addCompoundIndex(content, fieldName) {
  if (!fieldName) return { content, changed: false };

  // Check if the compound index already exists
  const compoundRegex = new RegExp(
    `\\.index\\(\\s*\\{\\s*tenantId\\s*:\\s*1\\s*,\\s*${fieldName}\\s*:\\s*1\\s*\\}`
  );
  if (compoundRegex.test(content)) return { content, changed: false };

  // Insert before "module.exports"
  const idx = content.lastIndexOf('module.exports');
  if (idx === -1) return { content, changed: false };

  // Find the schema variable name (e.g. customerSchema)
  const schemaVarMatch = content.match(/const\s+(\w+Schema)\s*=\s*new\s+mongoose\.Schema/);
  if (!schemaVarMatch) return { content, changed: false };
  const schemaVar = schemaVarMatch[1];

  const indexLine =
    `\n${schemaVar}.index({ tenantId: 1, ${fieldName}: 1 }, { unique: true });\n`;

  const updated =
    content.slice(0, idx) + indexLine + '\n' + content.slice(idx);
  return { content: updated, changed: true };
}

// ------------------- main -------------------

function processFile(filename) {
  const filePath = path.join(MODELS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipped (not found): ${filename}`);
    return { skipped: true };
  }

  const original = fs.readFileSync(filePath, 'utf8');
  let content = original;
  const changes = [];

  // 1. Add tenantId field
  const r1 = addTenantIdField(content);
  if (r1.changed) changes.push('added tenantId field');
  content = r1.content;

  // 2. Remove `unique: true` from the ID field
  const idField = UNIQUE_FIELDS[filename];
  if (idField) {
    const r2 = removeUniqueFromField(content, idField);
    if (r2.changed) changes.push(`removed unique from ${idField}`);
    content = r2.content;

    // 3. Add compound index
    const r3 = addCompoundIndex(content, idField);
    if (r3.changed) changes.push(`added compound index { tenantId, ${idField} }`);
    content = r3.content;
  }

  if (content === original) {
    console.log(`⏭️  ${filename}: no changes needed (already processed?)`);
    return { skipped: true };
  }

  if (DRY_RUN) {
    console.log(`🔍 ${filename}: would change — ${changes.join(', ')}`);
    return { dry: true };
  }

  backupFile(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ ${filename}: ${changes.join(', ')}`);
  return { changed: true };
}

console.log(`\n${DRY_RUN ? '🔍 DRY RUN' : '🚀 Applying tenantId to models'}...\n`);

let changed = 0, skipped = 0;
for (const file of MODELS) {
  const r = processFile(file);
  if (r.changed) changed++;
  else skipped++;
}

console.log(`\n${DRY_RUN ? '📋 Dry run complete.' : '✨ Done.'}`);
console.log(`   Files changed: ${changed}`);
console.log(`   Files skipped: ${skipped}`);
if (!DRY_RUN && changed > 0) {
  console.log(`   Backups saved to: backend/scripts/models-backup/`);
}

if (!DRY_RUN) {
  console.log(`\n👉 Next steps:`);
  console.log(`   1. Review the changes in VS Code`);
  console.log(`   2. If anything looks wrong, restore from backend/scripts/models-backup/`);
  console.log(`   3. Otherwise, run: git add -A && git commit -m "phase2: add tenantId to all models"`);
}
// node scripts/apply-tenant-id.js --dry-run