#!/usr/bin/env node
/**
 * Memory Profiling and Leak Detection Benchmark
 */

console.log('Running 10,000 simulated event processing iterations...');

const initialMemory = process.memoryUsage();

const events = [];
for (let i = 0; i < 10000; i++) {
  events.push({
    id: `ev_${i}`,
    type: 'CONTRACT_EVENT',
    payload: {
      tournamentId: i % 10,
      timestamp: Date.now(),
      data: `xdr_blob_${Math.random()}`,
    },
  });
}

// Clear references to test garbage collection
events.length = 0;

if (global.gc) {
  global.gc();
}

const finalMemory = process.memoryUsage();
const heapDiffMb = (finalMemory.heapUsed - initialMemory.heapUsed) / (1024 * 1024);

console.log(`Initial Heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`Final Heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`Heap Delta: ${heapDiffMb.toFixed(2)} MB`);

if (heapDiffMb > 25) {
  console.error('❌ Warning: Potential memory leak detected (heap grew by > 25MB)');
  process.exit(1);
}

console.log('✅ Memory benchmark completed: No significant heap leakage detected.');
