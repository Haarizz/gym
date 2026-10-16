#!/usr/bin/env node

/**
 * Linter check to flag hardcoded JSX text literals in already-migrated member directories.
 *
 * Prevents i18n regressions by ensuring all user-facing text uses t() translation keys.
 *
 * Usage:
 *   node scripts/check-i18n-literals.js [--all]
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT_DIR = path.resolve(__dirname, '..');

// Directories that are fully migrated and must not contain hardcoded text literals
const MIGRATED_DIRS = [
  'src/domains/memberPortal',
  'src/domains/community',
  'src/domains/family',
  'src/domains/member-referrals',
  'src/domains/membershipPayment',
  'src/domains/profile/presentation/screens/LanguageSelectScreen.tsx',
  'src/domains/profile/presentation/screens/MyProfileScreen.tsx',
  'src/domains/profile/presentation/screens/ProfileHubScreen.tsx',
  'src/domains/profile/presentation/screens/ProfileScreen.tsx',
  'src/domains/profile/presentation/screens/SettingsScreen.tsx',
  'src/domains/profile/presentation/screens/MyPerformanceScreen.tsx',
  'src/domains/profile/presentation/screens/MyTargetsScreen.tsx',
  'src/domains/profile/presentation/components/ProfileSummaryCard.tsx',
  'src/domains/profile/presentation/components/StaffProfileSections.tsx',
  'src/domains/profile/presentation/components/PerformanceOverviewCard.tsx',
  'src/domains/profile/presentation/components/TargetCard.tsx',
  'src/domains/profile/notifications',
  // Phase 3a: Role selection & login
  'src/domains/auth/presentation/screens/RoleSelectionScreen.tsx',
  'src/domains/auth/presentation/screens/RoleLoginScreen.tsx',
  'src/domains/auth/presentation/screens/RoleShellScreens.tsx',
  'src/domains/auth/presentation/forms/LoginForm.tsx',
  // Phase 3b: Trainer & Staff dashboards
  'src/domains/dashboard/presentation/screens/TrainerDashboardScreen.tsx',
  'src/domains/dashboard/presentation/screens/StaffDashboardScreen.tsx',
  'src/domains/dashboard/presentation/components/TrainerWelcomeCard.tsx',
  'src/domains/dashboard/presentation/components/TrainerStatsGrid.tsx',
  'src/domains/dashboard/presentation/components/TrainerPendingTasksCard.tsx',
  'src/domains/dashboard/presentation/components/TrainerTodayScheduleCard.tsx',
  'src/domains/dashboard/presentation/components/TrainerQuickActions.tsx',
  'src/domains/dashboard/presentation/components/QuickActionsGrid.tsx',
  'src/domains/dashboard/presentation/components/StaffWelcomeCard.tsx',
  'src/domains/dashboard/presentation/components/StaffStatsGrid.tsx',
  'src/domains/dashboard/presentation/components/StaffQuickActions.tsx',
  'src/domains/dashboard/presentation/components/StaffUrgentFollowUpsCard.tsx',
  'src/domains/dashboard/presentation/components/StaffRecentConversionsCard.tsx',
  'src/domains/dashboard/presentation/components/StaffMonthSummaryCard.tsx',
  // Phase 3c: Check-In domain
  'src/domains/checkIn',
  // Phase 3d: Schedule domain
  'src/domains/schedule',
  // Phase 3d: Performance domain
  'src/domains/performance',
  // Phase 3d: Ledger domain
  'src/domains/ledger',
];

// Patterns and tokens that are allowed as literals
const IGNORE_PATTERNS = [
  /^[\s\d•·\-\/\$\€\₹\¥\%\:\,\.\+\(\)\#\*\★\|\>\<\=\_\–\—\✓\🎉\👥\→\←\↑\↓]+$/, // Symbols, math, punctuation
  /^(GymBios|BNPL|JPEG|JPG|PNG|PDF|UPI|Stripe|SMS|OTP|ID|URL|HTTP|HTTPS)$/i,       // Acronyms & brand names
];

function isIgnored(text) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return IGNORE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function getFiles(targetPath) {
  const fullPath = path.join(ROOT_DIR, targetPath);
  if (!fs.existsSync(fullPath)) return [];
  const stat = fs.statSync(fullPath);
  if (stat.isFile()) {
    return fullPath.endsWith('.tsx') ? [fullPath] : [];
  }
  let files = [];
  for (const entry of fs.readdirSync(fullPath, { withFileTypes: true })) {
    const childPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFiles(childPath));
    } else if (entry.name.endsWith('.tsx')) {
      files.push(path.join(ROOT_DIR, childPath));
    }
  }
  return files;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const findings = [];

  function visit(node) {
    if (ts.isJsxText(node)) {
      const text = node.text.trim();
      if (!isIgnored(text)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        findings.push({ line: line + 1, text });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

function main() {
  console.log('\nScanning migrated member directories for un-localized JSX text literals...');

  let totalFiles = 0;
  let totalIssues = 0;
  const issuesByFile = {};

  for (const dirOrFile of MIGRATED_DIRS) {
    const files = getFiles(dirOrFile);
    totalFiles += files.length;
    for (const file of files) {
      const issues = checkFile(file);
      if (issues.length > 0) {
        totalIssues += issues.length;
        issuesByFile[path.relative(ROOT_DIR, file)] = issues;
      }
    }
  }

  if (totalIssues === 0) {
    console.log(`✓ Clean! Checked ${totalFiles} TSX files in migrated member directories. Zero hardcoded text literals found.\n`);
    process.exit(0);
  } else {
    console.error(`\nFound ${totalIssues} hardcoded text literal(s) across ${Object.keys(issuesByFile).length} file(s):\n`);
    for (const [file, issues] of Object.entries(issuesByFile)) {
      console.error(`  ${file}:`);
      for (const issue of issues) {
        console.error(`    Line ${issue.line}: "${issue.text}"`);
      }
    }
    console.error('\nPlease replace these literals with t(\'key\') translations.\n');
    process.exit(1);
  }
}

main();
