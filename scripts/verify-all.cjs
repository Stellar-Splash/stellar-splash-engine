#!/usr/bin/env node

/**
 * Stellar Splash - Unified Cross-Repository Test & Typecheck Runner
 * Concurrently or sequentially verifies frontend, backend engine, and Soroban contracts.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

const REPOS = [
  {
    name: 'Frontend (Vite / React / TypeScript)',
    path: path.join(ROOT_DIR, 'stellar-splash-frontend'),
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['test'],
    typecheckArgs: ['run', 'typecheck'],
  },
  {
    name: 'Backend Engine (Node.js / Express / Vitest)',
    path: path.join(ROOT_DIR, 'stellar-splash-engine'),
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['test'],
    typecheckArgs: ['run', 'typecheck'],
  },
  {
    name: 'Smart Contracts (Soroban / Rust)',
    path: path.join(ROOT_DIR, 'stellar-splash-contracts'),
    command: 'cargo',
    args: ['test', '--verbose'],
    typecheckArgs: null,
  },
];

function runCommand(command, args, cwd) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const proc = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    proc.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      resolve({ code, durationMs });
    });

    proc.on('error', (err) => {
      const durationMs = Date.now() - startTime;
      console.error(`Failed to execute ${command}:`, err.message);
      resolve({ code: 1, durationMs, error: err.message });
    });
  });
}

async function verifyAll() {
  console.log('\n=============================================================');
  console.log('🌊 Stellar Splash - Unified Verification Suite');
  console.log('=============================================================\n');

  const results = [];
  let allPassed = true;

  for (const repo of REPOS) {
    if (!fs.existsSync(repo.path)) {
      console.warn(`⚠️ Repository directory not found: ${repo.path}`);
      results.push({ name: repo.name, status: 'SKIPPED', durationMs: 0 });
      continue;
    }

    console.log(`\n▶ Verifying: ${repo.name}`);
    console.log(`  Directory: ${repo.path}`);

    // Run Typecheck if configured
    if (repo.typecheckArgs) {
      console.log(`  Running Typecheck: ${repo.command} ${repo.typecheckArgs.join(' ')}`);
      const tcResult = await runCommand(repo.command, repo.typecheckArgs, repo.path);
      if (tcResult.code !== 0) {
        console.error(`❌ Typecheck failed in ${repo.name}`);
        allPassed = false;
        results.push({ name: `${repo.name} [Typecheck]`, status: 'FAILED', durationMs: tcResult.durationMs });
        continue;
      }
    }

    // Run Tests
    console.log(`  Running Tests: ${repo.command} ${repo.args.join(' ')}`);
    const testResult = await runCommand(repo.command, repo.args, repo.path);
    const passed = testResult.code === 0;
    if (!passed) allPassed = false;

    results.push({
      name: repo.name,
      status: passed ? 'PASSED' : 'FAILED',
      durationMs: testResult.durationMs,
    });
  }

  console.log('\n=============================================================');
  console.log('📊 Verification Summary');
  console.log('=============================================================');
  for (const r of results) {
    const icon = r.status === 'PASSED' ? '✅' : (r.status === 'SKIPPED' ? '⚠️' : '❌');
    const dur = `${(r.durationMs / 1000).toFixed(2)}s`;
    console.log(`${icon} ${r.name.padEnd(45)} | Status: ${r.status.padEnd(7)} | Duration: ${dur}`);
  }
  console.log('=============================================================\n');

  if (allPassed) {
    console.log('🎉 ALL REPOSITORIES PASSED VERIFICATION! Ready for production deployment.\n');
    process.exit(0);
  } else {
    console.error('💥 ONE OR MORE REPOSITORIES FAILED VERIFICATION. Please review logs above.\n');
    process.exit(1);
  }
}

verifyAll();
