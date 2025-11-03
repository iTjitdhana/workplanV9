/*
  Read-only env inspector.
  - Scans common .env locations
  - Prints present variables
  - Masks sensitive values
  - Does NOT create/modify any files
*/

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const candidateFiles = [
  '.env',
  path.join('backend', '.env'),
  path.join('backend', '.env.production'),
  path.join('backend', '.env.development'),
  path.join('infra', '.env'),
  path.join('tools', 'docker', '.env'),
  path.join('frontend', '.env'),
  path.join('frontend', '.env.production'),
  path.join('frontend', '.env.development'),
];

const SENSITIVE = /(PASSWORD|PASS|SECRET|TOKEN|KEY|DB_PASSWORD|API_KEY|ACCESS_TOKEN)/i;

function maskValue(key, value) {
  if (!value) return '';
  if (SENSITIVE.test(key)) return '***';
  if (value.length <= 8) return value.replace(/[^=]/g, '*');
  return value.slice(0, 2) + '***' + value.slice(-2);
}

function parseEnv(content) {
  const lines = content.split(/\r?\n/);
  const entries = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^"|"$/g, '');
    if (!key) continue;
    entries.push([key, value]);
  }
  return entries;
}

function printEnvReport(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const entries = parseEnv(content);
    if (entries.length === 0) {
      console.log(`- ${filePath}: (no variables found)`);
      return;
    }
    console.log(`- ${filePath}:`);
    for (const [key, value] of entries) {
      console.log(`    ${key}=${maskValue(key, value)}`);
    }
  } catch (err) {
    console.log(`- ${filePath}: (unreadable or not found)`);
  }
}

console.log('Scanning .env files (read-only)...');
for (const rel of candidateFiles) {
  const abs = path.join(repoRoot, rel);
  if (fs.existsSync(abs)) {
    printEnvReport(rel);
  } else {
    // still report that we checked
    console.log(`- ${rel}: (not found)`);
  }
}
console.log('Done.');


