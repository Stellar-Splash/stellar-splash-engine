import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { PersistentStoreService } from '../services/persistent-store.service';

describe('PersistentStoreService', () => {
  const testDir = path.resolve(process.cwd(), 'scratch-test-data');
  let store: PersistentStoreService;

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    store = new PersistentStoreService({ dataDir: testDir });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('creates target directory automatically', () => {
    expect(fs.existsSync(testDir)).toBe(true);
  });

  it('saves and loads JSON snapshots atomically', async () => {
    const payload = {
      tournaments: [
        { id: 't-1', name: 'Genesis Cup', prizePool: 500 },
        { id: 't-2', name: 'Stellar Splashdown', prizePool: 1200 },
      ],
      updatedAt: 1729000000,
    };

    await store.saveSnapshot('tournaments.json', payload);
    const loaded = await store.loadSnapshot('tournaments.json', { tournaments: [] });

    expect(loaded).toEqual(payload);
  });

  it('returns fallback data when snapshot file does not exist', async () => {
    const fallback = { count: 0, items: [] };
    const loaded = await store.loadSnapshot('non-existent.json', fallback);

    expect(loaded).toEqual(fallback);
  });

  it('deletes snapshot file cleanly', async () => {
    await store.saveSnapshot('temp.json', { ok: true });
    expect(fs.existsSync(path.join(testDir, 'temp.json'))).toBe(true);

    const deleted = await store.deleteSnapshot('temp.json');
    expect(deleted).toBe(true);
    expect(fs.existsSync(path.join(testDir, 'temp.json'))).toBe(false);
  });
});
