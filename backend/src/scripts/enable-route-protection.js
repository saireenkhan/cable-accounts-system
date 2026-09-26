/**
 * enable-route-protection.js
 *
 * Un-comments `// router.use(protect);` in all route files.
 *
 * Safe: backs up each file to scripts/routes-backup/.
 * Idempotent: does nothing if `router.use(protect);` is already active.
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const ROUTES_DIR = path.join(__dirname, '..', 'routes');
const BACKUP_DIR = path.join(__dirname, 'routes-backup');

function backupFile(filePath) {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.copyFileSync(filePath, path.join(BACKUP_DIR, path.basename(filePath)));
}

function processFile(filename) {
  const filePath = path.join(ROUTES_DIR, filename);
  const original = fs.readFileSync(filePath, 'utf8');

  // Look for: // router.use(protect);
  // Handle optional whitespace variations
  const commentedRegex = /\/\/\s*router\.use\(protect\)\s*;?/;
  const alreadyActiveRegex = /^\s*router\.use\(protect\)\s*;/m;

  if (alreadyActiveRegex.test(original) && !commentedRegex.test(original)) {
    console.log(`⏭️  ${filename}: already protected`);
    return { skipped: true };
  }

  if (!commentedRegex.test(original)) {
    console.log(`⏭️  ${filename}: no commented protect line found`);
    return { skipped: true };
  }

  const updated = original.replace(
    /\/\/\s*router\.use\(protect\)\s*;?/g,
    'router.use(protect);'
  );

  if (updated === original) {
    console.log(`⏭️  ${filename}: nothing to change`);
    return { skipped: true };
  }

  if (DRY_RUN) {
    console.log(`🔍 ${filename}: would un-comment router.use(protect)`);
    return { dry: true };
  }

  backupFile(filePath);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`✅ ${filename}: enabled protect`);
  return { changed: true };
}

const files = fs
  .readdirSync(ROUTES_DIR)
  .filter((f) => f.endsWith('.js'));

console.log(`\n${DRY_RUN ? '🔍 DRY RUN' : '🚀 Enabling route protection'}...`);
console.log(`📁 Routes: ${ROUTES_DIR}\n`);

let changed = 0, skipped = 0;
files.forEach((f) => {
  const r = processFile(f);
  if (r.changed) changed++;
  else skipped++;
});

console.log(`\n${DRY_RUN ? '📋 Dry run complete.' : '✨ Done.'}`);
console.log(`   Files changed: ${changed}`);
console.log(`   Files skipped: ${skipped}`);
if (!DRY_RUN && changed > 0) {
  console.log(`   Backups saved to: src/scripts/routes-backup/`);
}