import { describe, it, expect, vi } from 'vitest';
import { LedgerSequenceSyncService } from '../src/services/ledger-sync.service';

describe('LedgerSequenceSyncService', () => {
  it('detects synchronized ledgers when lag is within tolerance', async () => {
    const service = new LedgerSequenceSyncService('http://horizon.test', 'http://soroban.test');

    vi.spyOn(service, 'fetchHorizonLedger').mockResolvedValue(10050);
    vi.spyOn(service, 'fetchSorobanLedger').mockResolvedValue(10049);

    const status = await service.checkSync();
    expect(status.isSynced).toBe(true);
    expect(status.sequenceLag).toBe(1);
    expect(status.warning).toBeUndefined();
  });

  it('flags desynchronization when lag exceeds threshold', async () => {
    const service = new LedgerSequenceSyncService('http://horizon.test', 'http://soroban.test');

    vi.spyOn(service, 'fetchHorizonLedger').mockResolvedValue(10050);
    vi.spyOn(service, 'fetchSorobanLedger').mockResolvedValue(10040); // 10 ledgers behind

    const status = await service.checkSync();
    expect(status.isSynced).toBe(false);
    expect(status.sequenceLag).toBe(10);
    expect(status.warning).toContain('exceeds maximum allowed lag');
  });

  it('handles unreachable ledger providers gracefully', async () => {
    const service = new LedgerSequenceSyncService('http://horizon.test', 'http://soroban.test');

    vi.spyOn(service, 'fetchHorizonLedger').mockResolvedValue(0);
    vi.spyOn(service, 'fetchSorobanLedger').mockResolvedValue(10050);

    const status = await service.checkSync();
    expect(status.isSynced).toBe(false);
    expect(status.warning).toContain('Failed to fetch ledger sequence');
  });
});
