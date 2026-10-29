import { describe, it, expect, vi } from 'vitest';
import { SorobanPreflightService } from '../src/services/preflight.service';

describe('SorobanPreflightService', () => {
  it('rejects invalid or empty transaction XDR', async () => {
    const service = new SorobanPreflightService('http://localhost:8000');
    const result = await service.simulate({ transactionXdr: '' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid or empty transaction XDR');
  });

  it('handles successful simulation responses', async () => {
    const service = new SorobanPreflightService('http://localhost:8000');
    // Mock global fetch
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          minResourceFee: '150000',
          cost: {
            cpuInsns: '1200000',
            memBytes: '64000',
          },
          events: [{}, {}],
        },
      }),
    } as any);

    try {
      const result = await service.simulate({ transactionXdr: 'AAAA_VALID_XDR' });
      expect(result.success).toBe(true);
      expect(result.minResourceFeeStroops).toBe('150000');
      expect(result.cpuInstructions).toBe(1200000);
      expect(result.memoryBytes).toBe(64000);
      expect(result.eventsCount).toBe(2);
      expect(result.costEstimateXlm).toBe('0.0150000');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('handles RPC simulation failure errors', async () => {
    const service = new SorobanPreflightService('http://localhost:8000');
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          error: 'HostError: Error(Contract, #12)',
        },
      }),
    } as any);

    try {
      const result = await service.simulate({ transactionXdr: 'AAAA_ERROR_XDR' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('HostError: Error(Contract, #12)');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
