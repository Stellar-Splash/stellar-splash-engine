import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimitTierService } from '../src/services/rate-limit-tier.service';

describe('RateLimitTierService', () => {
  beforeEach(() => {
    RateLimitTierService.resetAll();
  });

  it('allows requests within anonymous tier threshold and tracks remaining', () => {
    const id = '192.168.1.1';
    const now = 1_000_000;

    const res1 = RateLimitTierService.recordRequest(id, 'ANONYMOUS', now);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(29);
    expect(res1.limit).toBe(30);

    const check = RateLimitTierService.checkLimit(id, 'ANONYMOUS', now);
    expect(check.remaining).toBe(29);
  });

  it('rejects requests when rate limit is exceeded', () => {
    const id = '192.168.1.2';
    const now = 1_000_000;

    for (let i = 0; i < 30; i++) {
      RateLimitTierService.recordRequest(id, 'ANONYMOUS', now + i * 10);
    }

    const blocked = RateLimitTierService.recordRequest(id, 'ANONYMOUS', now + 500);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetAfterMs).toBeGreaterThan(0);
  });

  it('supports higher limits for player and creator tiers', () => {
    const player = 'GBBD...PLAYER';
    const now = 2_000_000;

    for (let i = 0; i < 50; i++) {
      RateLimitTierService.recordRequest(player, 'PLAYER', now + i * 10);
    }

    const check = RateLimitTierService.checkLimit(player, 'PLAYER', now + 600);
    expect(check.allowed).toBe(true);
    expect(check.remaining).toBe(70); // 120 - 50 = 70
  });

  it('slides window forward after windowMs elapsed', () => {
    const id = '192.168.1.3';
    const t0 = 100_000;

    for (let i = 0; i < 30; i++) {
      RateLimitTierService.recordRequest(id, 'ANONYMOUS', t0);
    }

    // Immediately blocked
    expect(RateLimitTierService.checkLimit(id, 'ANONYMOUS', t0).allowed).toBe(false);

    // 61 seconds later
    const t1 = t0 + 61_000;
    const afterWindow = RateLimitTierService.recordRequest(id, 'ANONYMOUS', t1);
    expect(afterWindow.allowed).toBe(true);
    expect(afterWindow.remaining).toBe(29);
  });

  it('prunes old window records', () => {
    const id = '192.168.1.4';
    RateLimitTierService.recordRequest(id, 'ANONYMOUS', 1000);

    const pruned = RateLimitTierService.pruneOldWindows(70_000);
    expect(pruned).toBe(1);
  });
});
