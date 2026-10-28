import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { StoreService } from '../src/services/store.service';
import { Tournament } from '../src/types';

describe('Tournament Pagination & Query Filters', () => {
  const app = createApp();

  beforeEach(() => {
    StoreService.reset();

    // Populate multiple mock tournaments
    for (let i = 1; i <= 25; i++) {
      const tourn: Tournament = {
        id: `t-${i.toString().padStart(3, '0')}`,
        name: `Tournament #${i}`,
        description: `Description for tournament ${i}`,
        gameId: 'splash-rush',
        gameVersion: '1.0.0',
        creatorWallet: 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB',
        prizeAsset: 'USDC',
        prizePoolAmount: 100 * i,
        vaultAddress: 'GB6V2A73VUX6KAZD66N6E64B44J7K3XW6P2W3V7QOXWCV7T4KQL3ZPL2',
        maxParticipants: 16,
        currentParticipants: 2,
        startTime: 1000 + i * 10,
        endTime: 2000 + i * 10,
        state: i % 2 === 0 ? 'OPEN' : 'COMPLETED',
        createdAt: 1000 + i * 10,
        updatedAt: 1000 + i * 10,
      };
      StoreService.saveTournament(tourn);
    }
  });

  it('paginates results with page and limit parameters', async () => {
    const res = await request(app).get('/api/tournaments?page=1&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBe(25);
    expect(res.body.totalPages).toBe(3);
    expect(res.body.count).toBe(10);
    expect(res.body.tournaments).toHaveLength(10);

    // Verify page 2 has next 10
    const res2 = await request(app).get('/api/tournaments?page=2&limit=10');
    expect(res2.body.count).toBe(10);
    expect(res2.body.page).toBe(2);

    // Verify page 3 has remaining 5
    const res3 = await request(app).get('/api/tournaments?page=3&limit=10');
    expect(res3.body.count).toBe(5);
    expect(res3.body.page).toBe(3);
  });

  it('filters tournaments by state', async () => {
    const res = await request(app).get('/api/tournaments?status=OPEN');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBe(12); // Even numbers between 1 and 25
    expect(res.body.tournaments.every((t: Tournament) => t.state === 'OPEN')).toBe(true);
  });

  it('sorts tournaments in ascending and descending order', async () => {
    const resDesc = await request(app).get('/api/tournaments?sort=desc&limit=5');
    expect(resDesc.body.tournaments[0].id).toBe('t-025');

    const resAsc = await request(app).get('/api/tournaments?sort=asc&limit=5');
    expect(resAsc.body.tournaments[0].id).toBe('t-001');
  });
});
