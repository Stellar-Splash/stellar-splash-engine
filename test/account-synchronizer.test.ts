import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { AccountSynchronizerService, VaultBalanceInfo } from '../src/services/account-synchronizer.service';
import { StoreService } from '../src/services/store.service';
import { Tournament } from '../src/types';

describe('AccountSynchronizerService & Vault Solvency Reconciler', () => {
  const app = createApp();
  const testVault = 'CACHWJEZY6JN36VFACWRQ7FP4T5EPRRRNBVLOSFHXTJHETZY36JD7QYJ';

  beforeEach(() => {
    StoreService.reset();
    AccountSynchronizerService.clearCache();
  });

  it('calculates solvency correctly when on-chain vault balance covers obligations', async () => {
    const mockBalance: VaultBalanceInfo = {
      vaultAddress: testVault,
      nativeXLM: 2000,
      subentryCount: 2,
      baseReserveXLM: 2.0,
      spendableXLM: 1998,
      assetBalances: { USDC: 1000 },
      fetchedAt: Date.now(),
    };
    AccountSynchronizerService.setMockBalance(mockBalance);

    const tourn1: Tournament = {
      id: 'tourn-solvency-1',
      name: 'Aqua Cup',
      description: 'Solvency test tournament',
      gameId: 'splash-rush',
      gameVersion: '1.0.0',
      creatorWallet: 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB',
      prizeAsset: 'XLM',
      prizePoolAmount: 500,
      vaultAddress: testVault,
      maxParticipants: 10,
      currentParticipants: 2,
      startTime: Date.now() - 10000,
      endTime: Date.now() + 100000,
      state: 'OPEN',
      createdAt: Date.now() - 10000,
      updatedAt: Date.now() - 10000,
    };
    StoreService.saveTournament(tourn1);

    const summary = await AccountSynchronizerService.reconcileVaultObligations(testVault);
    expect(summary.vaultAddress).toBe(testVault);
    expect(summary.onChainBalanceXLM).toBe(2000);
    expect(summary.totalEscrowObligationXLM).toBe(500);
    expect(summary.surplusOrDeficitXLM).toBe(1500);
    expect(summary.isSolvent).toBe(true);
    expect(summary.activeTournamentCount).toBe(1);
  });

  it('detects deficit when tournament obligations exceed on-chain vault balance', async () => {
    const mockBalance: VaultBalanceInfo = {
      vaultAddress: testVault,
      nativeXLM: 300,
      subentryCount: 0,
      baseReserveXLM: 1.0,
      spendableXLM: 299,
      assetBalances: {},
      fetchedAt: Date.now(),
    };
    AccountSynchronizerService.setMockBalance(mockBalance);

    const tournOverdraft: Tournament = {
      id: 'tourn-overdraft',
      name: 'Grand Mega Cup',
      description: 'Big tournament',
      gameId: 'splash-rush',
      gameVersion: '1.0.0',
      creatorWallet: 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB',
      prizeAsset: 'XLM',
      prizePoolAmount: 1000,
      vaultAddress: testVault,
      maxParticipants: 100,
      currentParticipants: 50,
      startTime: Date.now() - 10000,
      endTime: Date.now() + 100000,
      state: 'OPEN',
      createdAt: Date.now() - 10000,
      updatedAt: Date.now() - 10000,
    };
    StoreService.saveTournament(tournOverdraft);

    const summary = await AccountSynchronizerService.reconcileVaultObligations(testVault);
    expect(summary.onChainBalanceXLM).toBe(300);
    expect(summary.totalEscrowObligationXLM).toBe(1000);
    expect(summary.surplusOrDeficitXLM).toBe(-700);
    expect(summary.isSolvent).toBe(false);
  });

  it('exposes GET /api/reconciliation/vault/solvency with HTTP 200 response', async () => {
    const res = await request(app).get('/api/reconciliation/vault/solvency');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary).toBeDefined();
    expect(typeof res.body.summary.isSolvent).toBe('boolean');
    expect(typeof res.body.summary.onChainBalanceXLM).toBe('number');
  });
});
