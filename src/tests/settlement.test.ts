import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { StoreService } from '../services/store.service';
import { SettlementService } from '../services/settlement.service';
import { CanonicalService } from '../services/canonical.service';
import { AgreementService } from '../services/agreement.service';
import { Tournament, FinalRankingRecord, PrizeAgreement } from '../types';

describe('Settlement and Reconciliation Engine', () => {
  const app = createApp();

  const testTournamentId = 'tourn-settle-test';
  const player1 = 'GCKAZD66N6E64B44J7K3XW6P2W3V7QOXWCV7T4KQL3ZPL2GB6V2A73VU';
  const player2 = 'GD4KQL3ZPL2GB6V2A73VUX6KAZD66N6E64B44J7K3XW6P2W3V7QOXWCV';
  const player3 = 'GBOXWCV7T4KQL3ZPL2GB6V2A73VUX6KAZD66N6E64B44J7K3XW6P2W3V';
  const creator = 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB';

  beforeEach(() => {
    StoreService.resetTournamentData(testTournamentId);

    // 1. Setup test tournament
    const tournament: Tournament = {
      id: testTournamentId,
      name: 'Championship Finals',
      description: 'Verifiable settlement test tournament',
      gameId: 'splash-rush',
      gameVersion: '1.0.0',
      creatorWallet: creator,
      prizeAsset: 'USDC',
      prizePoolAmount: 100,
      vaultAddress: 'GB6V2A73VUX6KAZD66N6E64B44J7K3XW6P2W3V7QOXWCV7T4KQL3ZPL2',
      maxParticipants: 16,
      currentParticipants: 3,
      startTime: Date.now() - 3600_000,
      endTime: Date.now() - 1000,
      state: 'FINALIZED',
      fundingTxHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
      fundingVerifiedAt: Date.now() - 3500_000,
      activeAgreementVersion: 1,
      createdAt: Date.now() - 3600_000,
      updatedAt: Date.now() - 1000,
    };
    StoreService.saveTournament(tournament);

    // 2. Setup verified results
    const results = [
      { matchId: 'm1', score: 3000, player: player1 },
      { matchId: 'm2', score: 2500, player: player2 },
      { matchId: 'm3', score: 1800, player: player3 },
    ];

    for (const r of results) {
      StoreService.saveGameResult({
        matchId: r.matchId,
        tournamentId: testTournamentId,
        playerWallet: r.player,
        gameVersion: '1.0.0',
        startTime: Date.now() - 2000,
        endTime: Date.now() - 1000,
        durationMs: 45000,
        eventsCount: 30,
        baseScore: r.score,
        comboBonus: 0,
        multiplierBonus: 0,
        penalties: 0,
        finalScore: r.score,
        accuracy: 95,
        maxCombo: 10,
        resultHash: `hash-${r.matchId}`,
        submittedAt: Date.now() - 1000,
        verified: true,
      });

      StoreService.saveVerification({
        verificationId: `v-${r.matchId}`,
        matchId: r.matchId,
        tournamentId: testTournamentId,
        playerWallet: r.player,
        gameVersion: '1.0.0',
        submittedScore: r.score,
        replayedScore: r.score,
        scoreMatch: true,
        resultHash: `hash-${r.matchId}`,
        verificationAlgorithm: 'DETERMINISTIC_REPLAY_ENGINE',
        verificationVersion: '1.0.0',
        verifier: 'verifier.stellar-splash.org',
        verifiedAt: Date.now() - 500,
        status: 'VERIFIED',
      });
    }

    // 3. Setup Final Ranking
    const rankingEntries = [
      {
        rank: 1,
        playerWallet: player1,
        score: 3000,
        accuracy: 95,
        completedAt: Date.now() - 1000,
        matchId: 'm1',
        resultHash: 'hash-m1',
      },
      {
        rank: 2,
        playerWallet: player2,
        score: 2500,
        accuracy: 90,
        completedAt: Date.now() - 1000,
        matchId: 'm2',
        resultHash: 'hash-m2',
      },
      {
        rank: 3,
        playerWallet: player3,
        score: 1800,
        accuracy: 85,
        completedAt: Date.now() - 1000,
        matchId: 'm3',
        resultHash: 'hash-m3',
      },
    ];

    const rankingHash = CanonicalService.computeRankingHash(testTournamentId, 1, rankingEntries);
    const ranking: FinalRankingRecord = {
      tournamentId: testTournamentId,
      rankingVersion: 1,
      entries: rankingEntries,
      rankingHash,
      finalizedAt: Date.now() - 500,
      finalizedBy: creator,
    };
    StoreService.saveRanking(ranking);

    // 4. Setup Locked Prize Agreement
    const agreement = AgreementService.createAgreement({
      tournamentId: testTournamentId,
      version: 1,
      prizeAsset: 'USDC',
      prizePoolAmount: 100,
      allocationRules: [
        { rank: 1, basisPoints: 5000, label: '1st Place (50%)' },
        { rank: 2, basisPoints: 3000, label: '2nd Place (30%)' },
        { rank: 3, basisPoints: 2000, label: '3rd Place (20%)' },
      ],
      createdBy: creator,
    });
    agreement.status = 'LOCKED';
    agreement.approvedBy = creator;
    agreement.approvedAt = Date.now() - 1000;
    agreement.lockedAt = Date.now() - 1000;
    StoreService.saveAgreement(agreement);

    // 5. Setup Prize Pool Funding
    StoreService.recordFunding({
      tournamentId: testTournamentId,
      txHash: tournament.fundingTxHash!,
      funderWallet: creator,
      destinationVault: tournament.vaultAddress,
      asset: 'USDC',
      amount: 100,
      ledger: 4893100,
      verifiedAt: Date.now() - 3500_000,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${tournament.fundingTxHash}`,
      status: 'CONFIRMED',
    });
  });

  describe('Eligibility Pipeline', () => {
    it('approves a tournament with locked agreement and finalized ranking', () => {
      const eligibility = SettlementService.checkEligibility(testTournamentId);
      expect(eligibility.eligible).toBe(true);
      expect(eligibility.reasons.length).toBe(0);
      expect(eligibility.agreement?.status).toBe('LOCKED');
      expect(eligibility.ranking?.entries.length).toBe(3);
    });

    it('rejects settlement when prize agreement is not LOCKED', () => {
      const agreement = StoreService.getActiveAgreement(testTournamentId)!;
      // Mutate status to DRAFT
      const unlockedAgreement: PrizeAgreement = {
        ...agreement,
        status: 'DRAFT',
      };
      // Force save by changing status
      const list = StoreService.getAgreementsForTournament(testTournamentId);
      list[0] = unlockedAgreement;

      const eligibility = SettlementService.checkEligibility(testTournamentId);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reasons.some((r) => r.includes('AGREEMENT_NOT_LOCKED'))).toBe(true);
    });

    it('rejects settlement if ranking hash does not match canonical calculation', () => {
      const ranking = StoreService.getRanking(testTournamentId)!;
      StoreService.saveRanking({
        ...ranking,
        rankingHash: 'tampered-fake-hash-00000000000000000000000000000000000000000000',
      });

      const eligibility = SettlementService.checkEligibility(testTournamentId);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reasons.some((r) => r.includes('RANKING_HASH_MISMATCH'))).toBe(true);
    });
  });

  describe('Deterministic Allocation & Accounting Invariants', () => {
    it('accurately divides 100 USDC with 5000, 3000, 2000 basis points', () => {
      const { snapshot, settlementRecord } = SettlementService.createSnapshot(testTournamentId);

      expect(snapshot.recipients.length).toBe(3);
      expect(snapshot.recipients[0].amount).toBe(50);
      expect(snapshot.recipients[0].playerWallet).toBe(player1);
      expect(snapshot.recipients[1].amount).toBe(30);
      expect(snapshot.recipients[1].playerWallet).toBe(player2);
      expect(snapshot.recipients[2].amount).toBe(20);
      expect(snapshot.recipients[2].playerWallet).toBe(player3);

      // Invariant: sum of allocations equals gross pool
      const sum = snapshot.recipients.reduce((acc, r) => acc + r.amount, 0);
      expect(sum).toBe(100);
      expect(settlementRecord.grossPrizePool).toBe(100);
    });

    it('allocates residual dust deterministically to Rank 1', () => {
      const payouts = AgreementService.calculateSettlementAllocations(10001, [
        { rank: 1, basisPoints: 5000, label: '1st' },
        { rank: 2, basisPoints: 3000, label: '2nd' },
        { rank: 3, basisPoints: 2000, label: '3rd' },
      ]);

      // 10001 * 0.50 = 5000
      // 10001 * 0.30 = 3000
      // 10001 * 0.20 = 2000
      // sum = 10000 -> dust = 1 -> awarded to Rank 1
      expect(payouts[0].amount).toBe(5001);
      expect(payouts[0].isResidualRecipient).toBe(true);
      expect(payouts[1].amount).toBe(3000);
      expect(payouts[2].amount).toBe(2000);
      expect(payouts.reduce((a, b) => a + b.amount, 0)).toBe(10001);
    });

    it('produces identical deterministic settlement hash for same inputs', () => {
      const { settlementRecord: s1 } = SettlementService.createSnapshot(testTournamentId);
      const hash1 = CanonicalService.computeSettlementHash({
        tournamentId: s1.tournamentId,
        settlementId: s1.settlementId,
        agreementHash: s1.agreementHash,
        rankingHash: s1.rankingHash,
        prizeAsset: s1.prizeAsset,
        recipients: s1.recipients.map((r) => ({
          rank: r.rank,
          playerWallet: r.playerWallet,
          amount: r.amount,
          allocationBps: r.allocationBps,
        })),
      });

      const hash2 = CanonicalService.computeSettlementHash({
        tournamentId: s1.tournamentId,
        settlementId: s1.settlementId,
        agreementHash: s1.agreementHash,
        rankingHash: s1.rankingHash,
        prizeAsset: s1.prizeAsset,
        recipients: s1.recipients.map((r) => ({
          rank: r.rank,
          playerWallet: r.playerWallet,
          amount: r.amount,
          allocationBps: r.allocationBps,
        })),
      });

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });
  });

  describe('Execution & Independent Reconciliation', () => {
    it('authorizes, executes, and reconciles settlement', async () => {
      // 1. Authorize
      const authorized = SettlementService.authorizeSettlement({
        tournamentId: testTournamentId,
        authorizedBy: creator,
      });
      expect(authorized.status).toBe('AUTHORIZED');
      expect(authorized.authorizedBy).toBe(creator);

      // 2. Execute
      const { settlement, transactions } = await SettlementService.executeSettlement({
        tournamentId: testTournamentId,
      });

      expect(transactions.length).toBe(3);
      expect(transactions.every((t) => t.status === 'CONFIRMED')).toBe(true);
      expect(transactions.every((t) => t.txHash.length === 64)).toBe(true);
      expect(transactions.every((t) => t.explorerUrl.includes('stellar.expert'))).toBe(true);
      expect(settlement.status).toBe('RECONCILED'); // Auto-reconciled on success

      // 3. Reconcile explicitly
      const rec = SettlementService.reconcileSettlement(settlement.settlementId);
      expect(rec.status).toBe('RECONCILED');
      expect(rec.matchedTransactions).toBe(3);
      expect(rec.mismatchedTransactions).toBe(0);
      expect(rec.expectedTotal).toBe(100);
      expect(rec.observedTotal).toBe(100);
    });

    it('detects reconciliation mismatch if an on-chain amount differs', async () => {
      const { settlement } = await SettlementService.executeSettlement({
        tournamentId: testTournamentId,
      });

      // Tamper with a transaction amount
      const txs = StoreService.getSettlementTransactions(settlement.settlementId);
      txs[0].actualAmount = 45; // expected 50

      const rec = SettlementService.reconcileSettlement(settlement.settlementId);
      expect(rec.status).toBe('MISMATCH');
      expect(rec.mismatchedTransactions).toBeGreaterThan(0);
      expect(rec.discrepancies.length).toBeGreaterThan(0);
    });
  });

  describe('REST API Endpoints', () => {
    it('GET /api/settlements/:tournamentId/eligibility returns eligibility status', async () => {
      const res = await request(app).get(`/api/settlements/${testTournamentId}/eligibility`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.eligibility.eligible).toBe(true);
    });

    it('GET /api/settlements/:tournamentId/preview returns calculated allocations', async () => {
      const res = await request(app).get(`/api/settlements/${testTournamentId}/preview`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.settlement.recipients.length).toBe(3);
      expect(res.body.settlement.grossPrizePool).toBe(100);
    });

    it('POST /api/settlements/:tournamentId/authorize authorizes settlement', async () => {
      const res = await request(app)
        .post(`/api/settlements/${testTournamentId}/authorize`)
        .send({ authorizedBy: creator });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.settlement.status).toBe('AUTHORIZED');
    });

    it('POST /api/settlements/:tournamentId/execute processes payouts', async () => {
      const res = await request(app)
        .post(`/api/settlements/${testTournamentId}/execute`)
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.settlement.status).toBe('RECONCILED');
      expect(res.body.transactions.length).toBe(3);
    });

    it('GET /api/settlements/player/:playerWallet returns player payout history', async () => {
      // Execute first
      await request(app).post(`/api/settlements/${testTournamentId}/execute`).send({});

      const res = await request(app).get(`/api/settlements/player/${player1}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.payouts[0].recipient.amount).toBe(50);
      expect(res.body.payouts[0].recipient.rank).toBe(1);
    });
  });
});
