import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StoreService } from '../src/services/store.service';
import { SolvencyMonitorWorker } from '../src/services/solvency-monitor.worker';
import { Tournament } from '../src/types';

describe('SolvencyMonitorWorker', () => {
  beforeEach(() => {
    StoreService.reset();
    SolvencyMonitorWorker.stop();
  });

  afterEach(() => {
    SolvencyMonitorWorker.stop();
  });

  it('evaluates fully solvent vault when balance meets or exceeds obligations', () => {
    const t: Tournament = {
      id: 'tourn-solv-1',
      name: 'Solvency Test Cup',
      description: 'Testing solvency',
      gameId: 'splash-rush',
      gameVersion: '1.0.0',
      creatorWallet: 'GA_CREATOR',
      prizeAsset: 'USDC',
      prizePoolAmount: 500,
      vaultAddress: 'CACHWJEZY6JN36VFACWRQ7FP4T5EPRRRNBVLOSFHXTJHETZY36JD7QYJ',
      maxParticipants: 16,
      currentParticipants: 4,
      startTime: 1000,
      endTime: 10000,
      state: 'OPEN',
      createdAt: 500,
      updatedAt: 500,
    };

    StoreService.saveTournament(t);

    const result = SolvencyMonitorWorker.checkSolvency(600);

    expect(result.isSolvent).toBe(true);
    expect(result.vaultBalance).toBe(600);
    expect(result.totalObligations).toBe(500);
    expect(result.ratioPct).toBe(120);
    expect(result.deficitAmount).toBe(0);
  });

  it('detects vault deficit and logs audit event when balance is insufficient', () => {
    const t: Tournament = {
      id: 'tourn-solv-2',
      name: 'Deficit Cup',
      description: 'Testing deficit',
      gameId: 'splash-rush',
      gameVersion: '1.0.0',
      creatorWallet: 'GA_CREATOR',
      prizeAsset: 'USDC',
      prizePoolAmount: 1000,
      vaultAddress: 'CACHWJEZY6JN36VFACWRQ7FP4T5EPRRRNBVLOSFHXTJHETZY36JD7QYJ',
      maxParticipants: 16,
      currentParticipants: 8,
      startTime: 1000,
      endTime: 10000,
      state: 'OPEN',
      createdAt: 500,
      updatedAt: 500,
    };

    StoreService.saveTournament(t);

    // Simulated balance is only 800 USDC (deficit of 200 USDC)
    const result = SolvencyMonitorWorker.checkSolvency(800);

    expect(result.isSolvent).toBe(false);
    expect(result.deficitAmount).toBe(200);
    expect(result.ratioPct).toBe(80);

    const auditLogs = StoreService.getAuditLogs();
    expect(auditLogs.some((l) => l.eventType === 'VAULT_DEFICIT_DETECTED')).toBe(true);
  });

  it('starts and stops worker timer without error', () => {
    SolvencyMonitorWorker.start(10000);
    SolvencyMonitorWorker.stop();
  });
});
