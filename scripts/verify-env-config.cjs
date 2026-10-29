#!/usr/bin/env node
const process = require('process');

console.log('Validating engine environment configuration...');

const contractId = process.env.CONTRACT_ID || 'CACHWJEZY6JN36VFACWRQ7FP4T5EPRRRNBVLOSFHXTJHETZY36JD7QYJ';
const rpcUrl = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const horizonUrl = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';

let hasError = false;

if (!contractId.startsWith('C') || contractId.length !== 56) {
  console.error(`❌ Invalid CONTRACT_ID: "${contractId}". Must be 56-character C-address.`);
  hasError = true;
}

if (!rpcUrl.startsWith('http://') && !rpcUrl.startsWith('https://')) {
  console.error(`❌ Invalid SOROBAN_RPC_URL: "${rpcUrl}". Must be HTTP/HTTPS.`);
  hasError = true;
}

if (!horizonUrl.startsWith('http://') && !horizonUrl.startsWith('https://')) {
  console.error(`❌ Invalid HORIZON_URL: "${horizonUrl}". Must be HTTP/HTTPS.`);
  hasError = true;
}

if (hasError) {
  process.exit(1);
}

console.log('✅ Environment configuration parameters validated successfully.');
