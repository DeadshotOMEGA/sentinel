#!/usr/bin/env node
/**
 * Claude Code Hook: CLAUDE.md Linter
 *
 * Purpose:
 * Validate CLAUDE.md files for structure and style.
 * This hook should RUN ONLY when a CLAUDE.md file is modified.
 *
 * This hook DOES NOT inject prompt content.
 * It only warns or fails on violations.
 */

import fs from 'fs';

const filePath = process.argv[2];

if (!filePath || !filePath.endsWith('CLAUDE.md')) {
  process.exit(0);
}

const content = fs.readFileSync(filePath, 'utf8');

const requiredSections = [
  '## Scope',
  '## Non-Negotiables',
  '## Defaults'
];

const missing = requiredSections.filter(
  section => !content.includes(section)
);

if (missing.length > 0) {
  console.error('❌ CLAUDE.md validation failed.');
  console.error('Missing required sections:');
  missing.forEach(m => console.error(`- ${m}`));
  process.exit(1);
}

if (content.length > 6000) {
  console.warn('⚠️ CLAUDE.md is large. Consider splitting into deeper directories.');
}

console.log('✅ CLAUDE.md passed basic lint checks.');
process.exit(0);
