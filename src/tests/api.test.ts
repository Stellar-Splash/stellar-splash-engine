import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Stellar Splash Engine API', () => {
  it('GET /api/health returns operational status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.network).toBe('Stellar Testnet');
  });

  it('GET /api/tournaments lists tournaments with initial seed', async () => {
    const res = await request(app).get('/api/tournaments');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tournaments.length).toBeGreaterThan(0);
    expect(res.body.tournaments[0].id).toBe('tourn-splash-001');
  });

  it('POST /api/tournaments creates a tournament in FUNDING state', async () => {
    const newTourn = {
      name: 'Soroban Speedrun #002',
      description: 'Competitive speed trial on Stellar Testnet',
      creatorWallet: 'GB6V2A73VUX6KAZD66N6E64B44J7K3XW6P2W3V7QOXWCV7T4KQL3ZPL2',
      prizeAsset: 'USDC',
      prizePoolAmount: 50,
      maxParticipants: 16,
      startTime: Date.now() + 1000,
      endTime: Date.now() + 86400 * 1000,
    };

    const res = await request(app).post('/api/tournaments').send(newTourn);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.tournament.state).toBe('FUNDING');
    expect(res.body.tournament.prizePoolAmount).toBe(50);
  });

  it('Player can join an OPEN tournament, duplicate joining is rejected', async () => {
    const playerWallet = 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB';

    // 1. Join open tournament
    const joinRes = await request(app)
      .post('/api/tournaments/tourn-splash-001/join')
      .send({ playerWallet });
    expect(joinRes.status).toBe(200);
    expect(joinRes.body.success).toBe(true);
    expect(joinRes.body.participant.playerWallet).toBe(playerWallet);

    // 2. Duplicate join should return 409
    const dupRes = await request(app)
      .post('/api/tournaments/tourn-splash-001/join')
      .send({ playerWallet });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
  });

  it('Complete Game lifecycle: start session, complete match, verify score', async () => {
    const playerWallet = 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB';

    // 1. Start game session
    const startRes = await request(app)
      .post('/api/games/start')
      .send({
        tournamentId: 'tourn-splash-001',
        playerWallet,
        gameId: 'splash-rush',
      });

    expect(startRes.status).toBe(201);
    const { matchId, sessionToken } = startRes.body.match;
    expect(matchId).toBeDefined();
    expect(sessionToken).toBeDefined();

    // 2. Complete game session with events
    const completeRes = await request(app)
      .post('/api/games/complete')
      .send({
        matchId,
        sessionToken,
        endTime: Date.now() + 45000,
        events: [
          { seq: 1, timestamp: 1000, type: 'TARGET_HIT', points: 200, combo: 1, multiplier: 1 },
          { seq: 2, timestamp: 2000, type: 'TARGET_HIT', points: 300, combo: 2, multiplier: 2 },
          { seq: 3, timestamp: 3000, type: 'HAZARD_HIT', points: 50, combo: 0, multiplier: 1 },
        ],
      });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.success).toBe(true);
    expect(completeRes.body.result.finalScore).toBeGreaterThan(0);
    expect(completeRes.body.result.resultHash).toHaveLength(64);

    // 3. Idempotent complete: resubmitting same match returns success with cached result
    const reSubmitRes = await request(app)
      .post('/api/games/complete')
      .send({
        matchId,
        sessionToken,
        endTime: Date.now() + 45000,
        events: [],
      });
    expect(reSubmitRes.status).toBe(200);
    expect(reSubmitRes.body.message).toContain('idempotent');

    // 4. Verify leaderboard reflects score
    const lbRes = await request(app).get('/api/tournaments/tourn-splash-001/leaderboard');
    expect(lbRes.status).toBe(200);
    const entry = lbRes.body.leaderboard.find((e: { playerWallet: string }) => e.playerWallet === playerWallet);
    expect(entry).toBeDefined();
    expect(entry.currentScore).toBe(completeRes.body.result.finalScore);
    expect(entry.scoreLabel).toBe('Current Score');
  });

  it('GET /api/reconciliation returns reconciled status for funded tournaments', async () => {
    const res = await request(app).get('/api/reconciliation/tourn-splash-001');
    expect(res.status).toBe(200);
    expect(res.body.reconciliation.status).toBe('RECONCILED');
    expect(res.body.reconciliation.expectedAmount).toBe(100);
    expect(res.body.reconciliation.onChainAmount).toBe(100);
  });

  it('Verification API: verify match, inspect verification record and attestation', async () => {
    // 1. Verify seed match
    const res = await request(app).post('/api/verification/match/match-genesis-001');
    expect(res.status).toBe(200);
    expect(res.body.verification.status).toBe('VERIFIED');
    expect(res.body.verification.attestation).toBeDefined();

    // 2. Fetch verification record
    const getRes = await request(app).get('/api/verification/match/match-genesis-001');
    expect(getRes.status).toBe(200);
    expect(getRes.body.verification.resultHash).toBeDefined();
  });

  it('Prize Agreement API: list, create, approve, and lock agreement', async () => {
    const tournamentId = 'tourn-splash-001';
    const creatorWallet = 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB';

    // 1. List existing agreements
    const listRes = await request(app).get(`/api/agreements/${tournamentId}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.agreements.length).toBeGreaterThan(0);

    // 2. Create version 2 with updated tiers
    const createRes = await request(app)
      .post('/api/agreements')
      .send({
        tournamentId,
        version: 2,
        prizeAsset: 'USDC',
        prizePoolAmount: 100,
        allocationRules: [
          { rank: 1, basisPoints: 6000, label: '1st (60%)' },
          { rank: 2, basisPoints: 2500, label: '2nd (25%)' },
          { rank: 3, basisPoints: 1500, label: '3rd (15%)' },
        ],
        createdBy: creatorWallet,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.agreement.version).toBe(2);
    expect(createRes.body.agreement.agreementHash).toBeDefined();

    // 3. Approve version 2
    const approveRes = await request(app)
      .post(`/api/agreements/${tournamentId}/2/approve`)
      .send({ approverWallet: creatorWallet });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.agreement.status).toBe('READY_TO_LOCK');

    // 4. Lock version 2
    const lockRes = await request(app)
      .post(`/api/agreements/${tournamentId}/2/lock`)
      .send({ actorWallet: creatorWallet });
    expect(lockRes.status).toBe(200);
    expect(lockRes.body.agreement.status).toBe('LOCKED');

    // 5. Verify active agreement is now version 2
    const activeRes = await request(app).get(`/api/agreements/${tournamentId}/active`);
    expect(activeRes.status).toBe(200);
    expect(activeRes.body.agreement.version).toBe(2);
    expect(activeRes.body.agreement.status).toBe('LOCKED');
  });

  it('Rankings API: view verified ranking preview and finalize rankings', async () => {
    const tournamentId = 'tourn-splash-001';
    const creatorWallet = 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB';

    // 1. Get preview ranking
    const getRes = await request(app).get(`/api/rankings/${tournamentId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.ranking.entries.length).toBeGreaterThan(0);

    // 2. Finalize ranking
    const finalizeRes = await request(app)
      .post(`/api/rankings/${tournamentId}/finalize`)
      .send({ finalizedBy: creatorWallet });
    expect(finalizeRes.status).toBe(201);
    expect(finalizeRes.body.ranking.rankingHash).toHaveLength(64);

    // 3. Immutability: Attempting to finalize again returns 409
    const secondFinalize = await request(app)
      .post(`/api/rankings/${tournamentId}/finalize`)
      .send({ finalizedBy: creatorWallet });
    expect(secondFinalize.status).toBe(409);
  });
});

