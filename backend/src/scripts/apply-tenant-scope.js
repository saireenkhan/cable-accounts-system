/**
 * apply-tenant-scope.js
 *
 * Walks every controller file and adds tenant scoping:
 *  - adds `const tenantScope = require('../utils/tenantScope');` at the top
 *  - renames model imports: `Customer` -> `CustomerModel`, `Area` -> `AreaModel`, etc.
 *  - inserts `const <Model> = tenantScope(<Model>Model, req);` at the top of
 *    each exported handler, for every scoped model used in that file.
 *
 * Safe: backs up every file to scripts/controllers-backup/ before editing.
 * Idempotent: skips handlers that already use tenantScope.
 *
 * Usage:
 *   cd backend
 *   node src/scripts/apply-tenant-scope.js --dry-run
 *   node src/scripts/apply-tenant-scope.js
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

// Controllers live at: backend/src/controllers/
const CTRL_DIR = path.join(__dirname, '..', 'controllers');
const BACKUP_DIR = path.join(__dirname, 'controllers-backup');

// Skip these — they don't need tenant scoping (or need special handling later)
const SKIP = [
  'authController.js',
  'whatsappController.js',
  'reportController.js',
  'bulkUploadController.js',
];

// Models that should be tenant-scoped
const MODELS_TO_SCOPE = [
  'Area',
  'Attendance',
  'Bill',
  'Customer',
  'Dealer',
  'DealerArea',
  'DealerPayment',
  'Expense',
  'InstallationCharge',
  'Package',
  'Partner',
  'PartnerArea',
  'PartnerList',
  'PartnerPayment',
  'Payment',
  'Purchase',
  'Staff',
  'WhatsAppConfig',
  'WhatsAppMessage',
  'WhatsAppSession',
];

// ------------------- helpers -------------------

function backupFile(filePath) {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.copyFileSync(filePath, path.join(BACKUP_DIR, path.basename(filePath)));
}

function controllerFiles() {
  return fs
    .readdirSync(CTRL_DIR)
    .filter((f) => f.endsWith('Controller.js'))
    .filter((f) => !SKIP.includes(f));
}

// Find the models required in this file (Customer, Area, etc.)
function findUsedModels(content) {
  const used = [];
  MODELS_TO_SCOPE.forEach((name) => {
    const re = new RegExp(`require\\(['"]\\.\\./models/${name}['"]\\)`);
    if (re.test(content)) used.push(name);
  });
  return used;
}

// Rename `const Customer = require('../models/Customer');`
// to     `const CustomerModel = require('../models/Customer');`
function renameModelImports(content, models) {
  let out = content;
  models.forEach((name) => {
    const re = new RegExp(
      `const\\s+${name}\\s*=\\s*require\\((['"])\\.\\./models/${name}\\1\\);`
    );
    out = out.replace(re, `const ${name}Model = require('../models/${name}');`);
  });
  return out;
}

// Ensure the tenantScope require line exists
function ensureTenantScopeRequire(content) {
  if (content.includes("require('../utils/tenantScope')")) return content;
  const lines = content.split('\n');
  let lastRequire = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*const\s+.+\s*=\s*require\(/.test(lines[i])) lastRequire = i;
  }
  const insertAt = lastRequire >= 0 ? lastRequire + 1 : 0;
  lines.splice(insertAt, 0, "const tenantScope = require('../utils/tenantScope');");
  return lines.join('\n');
}

// Find every `exports.xxx = async (req, res) => {` and inject scope lines
// for the models used in that handler.
function injectScopesInHandlers(content, models) {
  const handlerRe = /(exports\.[A-Za-z0-9_]+\s*=\s*async\s*\(\s*req\s*,\s*res\s*\)\s*=>\s*\{)/g;

  return content.replace(handlerRe, (match, header, offset) => {
    const insertAt = offset + header.length;
    const lookahead = content.slice(insertAt, insertAt + 4000);
    const relevant = models.filter((name) => {
      const re = new RegExp(`\\b${name}\\.`);
      return re.test(lookahead);
    });

    if (relevant.length === 0) return match;

    const lines = relevant
      .map((name) => `    const ${name} = tenantScope(${name}Model, req);`)
      .join('\n');

    const already = content
      .slice(insertAt, insertAt + 500)
      .includes('tenantScope(');
    if (already) return match;

    return `${header}\n${lines}`;
  });
}

function processFile(file) {
  const filePath = path.join(CTRL_DIR, file);
  const original = fs.readFileSync(filePath, 'utf8');
  let content = original;
  const changes = [];

  const models = findUsedModels(content);
  if (models.length === 0) {
    console.log(`⏭️  ${file}: no scoped models used`);
    return { skipped: true };
  }

  const before1 = content;
  content = renameModelImports(content, models);
  if (content !== before1) changes.push(`renamed ${models.length} model imports`);

  const before2 = content;
  content = ensureTenantScopeRequire(content);
  if (content !== before2) changes.push('added tenantScope require');

  const before3 = content;
  content = injectScopesInHandlers(content, models);
  if (content !== before3) changes.push('injected tenantScope per handler');

  if (content === original) {
    console.log(`⏭️  ${file}: already scoped`);
    return { skipped: true };
  }

  if (DRY_RUN) {
    console.log(`🔍 ${file}: would change — ${changes.join(', ')}`);
    return { dry: true };
  }

  backupFile(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ ${file}: ${changes.join(', ')}`);
  return { changed: true };
}

console.log(`\n${DRY_RUN ? '🔍 DRY RUN' : '🚀 Applying tenant scope'}...`);
console.log(`📁 Controllers: ${CTRL_DIR}\n`);

let changed = 0, skipped = 0;
controllerFiles().forEach((f) => {
  const r = processFile(f);
  if (r.changed) changed++;
  else skipped++;
});

console.log(`\n${DRY_RUN ? '📋 Dry run complete.' : '✨ Done.'}`);
console.log(`   Files changed: ${changed}`);
console.log(`   Files skipped: ${skipped}`);
if (!DRY_RUN && changed > 0) {
  console.log(`   Backups saved to: src/scripts/controllers-backup/`);
}