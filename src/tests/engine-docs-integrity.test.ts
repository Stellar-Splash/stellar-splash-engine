import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Engine Documentation Integrity', () => {
  const docsDir = path.join(__dirname, '..', '..', 'docs');

  it('contains valid benchmark commands in BENCHMARK_RUNBOOK', () => {
    const runbook = fs.readFileSync(path.join(docsDir, 'BENCHMARK_RUNBOOK.md'), 'utf8');
    expect(runbook).toContain('node scripts/load-test-synthetic.cjs');
    expect(runbook).toContain('stellar_splash_verified_replays_total');
  });

  it('contains security audit checklist with entropy gates', () => {
    const checklist = fs.readFileSync(path.join(docsDir, 'SECURITY_AUDIT_CHECKLIST.md'), 'utf8');
    expect(checklist).toContain('Shannon entropy');
    expect(checklist).toContain('Channel Account Treasury');
  });
});
