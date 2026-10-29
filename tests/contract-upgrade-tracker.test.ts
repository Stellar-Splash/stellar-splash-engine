import { describe, it, expect, beforeEach } from 'vitest';
import { ContractUpgradeTrackerService } from '../src/services/contract-upgrade-tracker.service';

describe('ContractUpgradeTrackerService', () => {
  beforeEach(() => {
    ContractUpgradeTrackerService.reset();
  });

  it('initializes with v1 deployment record', () => {
    const latest = ContractUpgradeTrackerService.getLatestUpgrade();
    expect(latest?.version).toBe(1);
    expect(latest?.protocolVersion).toBe(21);
    expect(ContractUpgradeTrackerService.isKnownWasmHash(latest!.wasmHash)).toBe(true);
  });

  it('records incremental WASM upgrades sequentially', () => {
    const dummyHash2 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const upgrade2 = ContractUpgradeTrackerService.recordUpgrade(
      dummyHash2,
      'GA_ADMIN_2',
      4850000,
      22
    );

    expect(upgrade2.version).toBe(2);
    expect(upgrade2.wasmHash).toBe(dummyHash2);
    expect(upgrade2.protocolVersion).toBe(22);

    const history = ContractUpgradeTrackerService.getUpgradeHistory();
    expect(history.length).toBe(2);
    expect(ContractUpgradeTrackerService.isKnownWasmHash(dummyHash2)).toBe(true);
    expect(ContractUpgradeTrackerService.isKnownWasmHash('unknown_hash')).toBe(false);
  });
});
