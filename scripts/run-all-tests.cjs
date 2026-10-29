/**
 * Master Test Suite Runner for Stellar Splash Engine.
 * Runs vitest suite followed by synthetic load and postman generation audits.
 */

const { execSync } = require('child_process');

function runAll() {
  console.log('=== Running Stellar Splash Engine Master Test Suite ===');
  
  console.log('[Step 1/3] Running Vitest Unit & Integration Suites...');
  execSync('npx vitest run', { stdio: 'inherit' });

  console.log('[Step 2/3] Verifying Postman Collection Export...');
  execSync('node scripts/generate-postman-collection.cjs', { stdio: 'inherit' });

  console.log('[Step 3/3] Simulating Settlement Execution Flow...');
  execSync('node scripts/simulate-settlement-flow.cjs', { stdio: 'inherit' });

  console.log('=== All Engine Verification Suites Passed Successfully! ===');
}

if (require.main === module) {
  try {
    runAll();
  } catch (err) {
    console.error('Master test run failed:', err.message);
    process.exit(1);
  }
}

module.exports = { runAll };
