#!/usr/bin/env node

/**
 * i18n coverage report script for GymBios Mobile.
 *
 * Scans src/core/i18n/locales/ to check translation coverage against English (en) reference keys.
 * Reports missing keys per locale and namespace.
 *
 * Usage:
 *   node scripts/i18n-coverage.js [--strict] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT_DIR = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(ROOT_DIR, 'src/core/i18n/locales');

const ACTIVE_LOCALES = ['en', 'hi', 'ar', 'de', 'fr', 'es', 'zh'];
const DEFERRED_LOCALES = ['ml', 'ta'];

const isStrict = process.argv.includes('--strict');
const isVerbose = process.argv.includes('--verbose') || process.argv.includes('-v');

function loadTsModule(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    const result = ts.transpileModule(content, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    });
    const m = { exports: {} };
    const fn = new Function('module', 'exports', 'require', result.outputText);
    fn(m, m.exports, require);
    return m.exports.default || m.exports;
  } catch (err) {
    return null;
  }
}

function getLeafKeys(obj, prefix = '') {
  let keys = [];
  if (!obj) return keys;
  for (const k of Object.keys(obj)) {
    const val = obj[k];
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      keys.push(...getLeafKeys(val, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function main() {
  const enDir = path.join(LOCALES_DIR, 'en');
  if (!fs.existsSync(enDir)) {
    console.error(`Error: English locale directory not found at ${enDir}`);
    process.exit(1);
  }

  const namespaces = fs
    .readdirSync(enDir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .sort();

  const enReference = {};
  let totalEnKeys = 0;

  for (const ns of namespaces) {
    const mod = loadTsModule(path.join(enDir, ns));
    const keys = getLeafKeys(mod);
    enReference[ns] = keys;
    totalEnKeys += keys.length;
  }

  console.log('\n======================================================');
  console.log('         GymBios Mobile — i18n Coverage Report        ');
  console.log('======================================================');
  console.log(`Reference English source: ${totalEnKeys} keys across ${namespaces.length} namespaces\n`);

  const results = {};
  let hasMissingActive = false;

  const allLocales = [...ACTIVE_LOCALES, ...DEFERRED_LOCALES];

  for (const loc of allLocales) {
    const locDir = path.join(LOCALES_DIR, loc);
    let translatedCount = 0;
    const missingByNamespace = {};

    for (const ns of namespaces) {
      const nsFile = path.join(locDir, ns);
      const enKeys = enReference[ns];
      if (!fs.existsSync(nsFile)) {
        missingByNamespace[ns] = enKeys;
        continue;
      }
      const mod = loadTsModule(nsFile);
      const locKeys = new Set(getLeafKeys(mod));
      const missing = enKeys.filter((k) => !locKeys.has(k));
      const present = enKeys.length - missing.length;
      translatedCount += present;

      if (missing.length > 0) {
        missingByNamespace[ns] = missing;
      }
    }

    const pct = totalEnKeys > 0 ? Math.round((translatedCount / totalEnKeys) * 100) : 0;
    const missingCount = totalEnKeys - translatedCount;
    results[loc] = {
      translatedCount,
      totalEnKeys,
      pct,
      missingCount,
      missingByNamespace,
      isDeferred: DEFERRED_LOCALES.includes(loc),
    };

    if (!DEFERRED_LOCALES.includes(loc) && missingCount > 0) {
      hasMissingActive = true;
    }
  }

  // Active languages table
  console.log('--- Active Languages ---');
  console.log('Locale | Translated / Total | Coverage | Status');
  console.log('-------|-------------------|----------|------------------');
  for (const loc of ACTIVE_LOCALES) {
    const r = results[loc];
    const status = r.missingCount === 0 ? '✓ Complete' : `Missing ${r.missingCount} keys`;
    console.log(
      `${loc.padEnd(6)} | ${(r.translatedCount + ' / ' + r.totalEnKeys).padEnd(17)} | ${(r.pct + '%').padEnd(8)} | ${status}`
    );
  }

  // Deferred languages table
  console.log('\n--- Deferred Languages (Not in scope) ---');
  console.log('Locale | Translated / Total | Coverage | Status');
  console.log('-------|-------------------|----------|------------------');
  for (const loc of DEFERRED_LOCALES) {
    const r = results[loc];
    console.log(
      `${loc.padEnd(6)} | ${(r.translatedCount + ' / ' + r.totalEnKeys).padEnd(17)} | ${(r.pct + '%').padEnd(8)} | Deferred`
    );
  }

  // Verbose or detailed missing breakdown
  for (const loc of ACTIVE_LOCALES) {
    const r = results[loc];
    if (r.missingCount > 0) {
      console.log(`\n[Details for ${loc}]:`);
      for (const [ns, missing] of Object.entries(r.missingByNamespace)) {
        console.log(`  - ${ns}: missing ${missing.length} keys`);
        if (isVerbose) {
          missing.forEach((k) => console.log(`      * ${k}`));
        }
      }
    }
  }

  console.log('\n======================================================\n');

  if (isStrict && hasMissingActive) {
    console.error('Error: Active languages have missing translations (--strict mode).\n');
    process.exit(1);
  }
}

main();
