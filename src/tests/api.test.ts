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
});
