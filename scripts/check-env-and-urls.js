/*
  Read-only inspector:
  - Prints values from frontend/.env.local and backend/.env (if accessible)
  - Scans frontend code for relative fetch('/api/...') and hardcoded localhost URLs
*/
const fs = require('fs');
const path = require('path');

const root = process.cwd();

function readEnv(file) {
  try {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) return { file, exists: false };
    const content = fs.readFileSync(p, 'utf8');
    const lines = content.split(/\r?\n/);
    const out = {};
    for (const line of lines) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2];
    }
    return { file, exists: true, vars: out };
  } catch (e) {
    return { file, exists: false, error: e.message };
  }
}

function scanFrontend() {
  const dir = path.join(root, 'frontend');
  const results = { relativeApiCalls: [], hardcodedUrls: [] };
  const reRelative = /fetch\(['"]\/(api\/[^'"\)]+)['"]/g;
  const reHardcoded = /https?:\/\/localhost:\d+|https?:\/\/192\.168\.[0-9.]+/g;

  function walk(d) {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        if (name === 'node_modules' || name === '.next') continue;
        walk(p);
      } else if (/\.(ts|tsx|js|mjs)$/.test(name)) {
        const content = fs.readFileSync(p, 'utf8');
        let m;
        while ((m = reRelative.exec(content))) {
          results.relativeApiCalls.push({ file: p, match: m[0] });
        }
        while ((m = reHardcoded.exec(content))) {
          results.hardcodedUrls.push({ file: p, url: m[0] });
        }
      }
    }
  }

  if (fs.existsSync(dir)) walk(dir);
  return results;
}

function main() {
  const feEnv = readEnv('frontend/.env.local');
  const beEnv = readEnv('backend/.env');

  console.log('===== ENV CHECK =====');
  console.log('frontend/.env.local:', feEnv);
  console.log('backend/.env:', beEnv.exists ? '(exists)' : '(missing or unreadable)');
  if (beEnv.exists) console.log(beEnv);

  console.log('\n===== FRONTEND SCAN =====');
  const scan = scanFrontend();
  console.log('Relative fetch("/api/...") calls:', scan.relativeApiCalls.length);
  scan.relativeApiCalls.slice(0, 50).forEach(x => console.log('-', x.file, '->', x.match));
  console.log('Hardcoded URLs found:', scan.hardcodedUrls.length);
  scan.hardcodedUrls.slice(0, 50).forEach(x => console.log('-', x.file, '->', x.url));

  console.log('\nTIP: Replace relative fetch with getApiUrl("/api/..") and remove hardcoded host:port');
}

main();


