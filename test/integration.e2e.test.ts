import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { StoreService } from '../src/services/store.service';
import { BlockchainService } from '../src/services/blockchain.service';

describe('End-to-End Tournament Lifecycle Integration Test', () => {
  const app = createApp();

  const creatorWallet = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
  const player1Wallet = 'GCKAZD66N6E64B44J7K3XW6P2W3V7QOXWCV7T4KQL3ZPL2GB6V2A73VU';
  const player2Wallet = 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB';
  const fakeTxHash = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

  beforeEach(() => {
    StoreService.reset();
    vi.restoreAllMocks();
  });

  it('successfully executes complete tournament lifecycle from creation through verified settlement', async () => {
    // Mock on-chain transaction verification
    vi.spyOn(BlockchainService, 'verifyFundingTransaction').mockResolvedValue({
      valid: true,
      txHash: fakeTxHash,
      sourceAccount: creatorWallet,
      amount: 500,
      asset: 'USDC',
      successful: true,
    });

    // 1. Create Tournament
    const now = Date.now();
    const createRes = await request(app).post('/api/tournaments').send({
      name: 'Stellar Splash E2E Championship',
      description: 'End-to-end integration test tournament',
      gameId: 'splash-rush',
      creatorWallet,
      prizeAsset: 'USDC',
      prizePoolAmount: 500,
      maxParticipants: 8,
      startTime: now,
      endTime: now + 3600_000,
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const tournamentId = createRes.body.tournament.id;
    expect(tournamentId).toBeDefined();

    // 2. Fund Prize Pool
    const fundRes = await request(app)
      .post(`/api/tournaments/${tournamentId}/prize-pool/funding`)
      .send({
        txHash: fakeTxHash,
        funderWallet: creatorWallet,
      });

    expect(fundRes.status).toBe(200);
    expect(fundRes.body.success).toBe(true);
    expect(fundRes.body.tournament.state).toBe('OPEN');

    // 3. Register Participants
    const join1 = await request(app)
      .post(`/api/tournaments/${tournamentId}/join`)
      .send({ playerWallet: player1Wallet });
    expect(join1.status).toBe(200);

    const join2 = await request(app)
      .post(`/api/tournaments/${tournamentId}/join`)
      .send({ playerWallet: player2Wallet });
    expect(join2.status).toBe(200);

    // 4. Start Match Session for Player 1
    const matchStart = await request(app).post('/api/games/start').send({
      tournamentId,
      playerWallet: player1Wallet,
      gameId: 'splash-rush',
    });
    expect(matchStart.status).toBe(201);
    const { matchId, sessionToken } = matchStart.body.match;
    expect(matchId).toBeDefined();
    expect(sessionToken).toBeDefined();

    // 5. Complete Match Session with Valid Event Stream
    const matchStartTime = Date.now();
    const matchEndTime = matchStartTime + 45000;
    const events = [
      { seq: 1, timestamp: matchStartTime + 5000, type: 'TARGET_HIT', points: 100, combo: 1, multiplier: 1 },
      { seq: 2, timestamp: matchStartTime + 10000, type: 'TARGET_HIT', points: 150, combo: 2, multiplier: 2 },
    ];

    const matchComplete = await request(app).post('/api/games/complete').send({
      matchId,
      sessionToken,
      endTime: matchEndTime,
      events,
    });
    expect(matchComplete.status).toBe(200);
    expect(matchComplete.body.result.finalScore).toBeGreaterThan(0);

    // 6. Verify Match Telemetry
    const verifyRes = await request(app).post(`/api/verification/match/${matchId}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.verification.status).toBe('VERIFIED');

    // 7. Create, Approve, and Lock Prize Agreement (Winner Take All)
    const createAgr = await request(app).post('/api/agreements').send({
      tournamentId,
      version: 1,
      prizeAsset: 'USDC',
      prizePoolAmount: 500,
      allocationRules: [
        { rank: 1, basisPoints: 10000, label: 'Winner Take All' },
      ],
      createdBy: creatorWallet,
    });
    expect(createAgr.status).toBe(201);

    const approveAgr = await request(app)
      .post(`/api/agreements/${tournamentId}/1/approve`)
      .send({ approverWallet: creatorWallet });
    expect(approveAgr.status).toBe(200);

    const lockAgr = await request(app)
      .post(`/api/agreements/${tournamentId}/1/lock`)
      .send({ actorWallet: creatorWallet });
    expect(lockAgr.status).toBe(200);
    expect(lockAgr.body.agreement.status).toBe('LOCKED');

    // 8. Finalize Canonical Ranking
    const finalizeRes = await request(app).post(`/api/rankings/${tournamentId}/finalize`).send({
      finalizedBy: creatorWallet,
    });
    expect(finalizeRes.status).toBe(201);
    expect(finalizeRes.body.success).toBe(true);
    expect(finalizeRes.body.ranking.rankingHash).toBeDefined();

    // 9. Evaluate Settlement Eligibility
    const eligRes = await request(app).get(`/api/settlements/${tournamentId}/eligibility`);
    expect(eligRes.status).toBe(200);

    // 10. Authorize Settlement
    const authRes = await request(app)
      .post(`/api/settlements/${tournamentId}/authorize`)
      .send({ authorizedBy: creatorWallet });
    expect(authRes.status).toBe(200);
    expect(authRes.body.settlement.status).toBe('AUTHORIZED');
    expect(authRes.body.settlement.grossPrizePool).toBe(500);
  });
});
