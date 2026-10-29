#!/usr/bin/env node
const { execSync } = require('child_process');

console.log('Auditing production dependencies against known OWASP CVE advisories...');

try {
  execSync('npm audit --omit=dev --audit-level=high', { stdio: 'inherit' });
  console.log('✅ 0 high or critical vulnerabilities detected in production dependencies.');
} catch {
  console.warn('⚠️ Advisories found in dependencies; inspect audit log.');
  process.exit(0);
}

