import { describe, it, expect } from 'vitest';

function validateEnvParams(params: { contractId: string; rpcUrl: string; horizonUrl: string }): boolean {
  if (!params.contractId.startsWith('C') || params.contractId.length !== 56) return false;
  if (!params.rpcUrl.startsWith('http://') && !params.rpcUrl.startsWith('https://')) return false;
  if (!params.horizonUrl.startsWith('http://') && !params.horizonUrl.startsWith('https://')) return false;
  return true;
}

describe('Environment Config Validator', () => {
  it('accepts valid Soroban contract ID and network URLs', () => {
    const valid = validateEnvParams({
      contractId: 'CACHWJEZY6JN36VFACWRQ7FP4T5EPRRRNBVLOSFHXTJHETZY36JD7QYJ',
      rpcUrl: 'https://soroban-testnet.stellar.org',
      horizonUrl: 'https://horizon-testnet.stellar.org',
    });
    expect(valid).toBe(true);
  });

  it('rejects invalid contract address prefix or length', () => {
    const invalid = validateEnvParams({
      contractId: 'GACHWJEZY6JN36VFACWRQ7FP4T5EPRRRNBVLOSFHXTJHETZY36JD7QYJ', // G-address instead of C
      rpcUrl: 'https://soroban-testnet.stellar.org',
      horizonUrl: 'https://horizon-testnet.stellar.org',
    });
    expect(invalid).toBe(false);
  });

  it('rejects malformed HTTP protocols', () => {
    const invalid = validateEnvParams({
      contractId: 'CACHWJEZY6JN36VFACWRQ7FP4T5EPRRRNBVLOSFHXTJHETZY36JD7QYJ',
      rpcUrl: 'ftp://soroban-testnet.stellar.org',
      horizonUrl: 'https://horizon-testnet.stellar.org',
    });
    expect(invalid).toBe(false);
  });
});

