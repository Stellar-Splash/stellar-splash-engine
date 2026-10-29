import { describe, it, expect, beforeEach } from 'vitest';
import { TokenAllowlistCacheService } from '../src/services/token-allowlist-cache.service';

describe('TokenAllowlistCacheService', () => {
  beforeEach(() => {
    TokenAllowlistCacheService.reset();
  });

  it('allows default seeded tokens like XLM and USDC', () => {
    const isXlmAllowed = TokenAllowlistCacheService.isTokenAllowed(
      'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA'
    );
    expect(isXlmAllowed).toBe(true);

    const xlmMeta = TokenAllowlistCacheService.getTokenMetadata(
      'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA'
    );
    expect(xlmMeta?.symbol).toBe('XLM');
    expect(xlmMeta?.decimals).toBe(7);
  });

  it('registers custom tokens with TTL', () => {
    const customToken = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
    const now = 1_000_000;

    TokenAllowlistCacheService.registerToken(
      customToken,
      'SPLASH',
      7,
      'GAEXAMPLE',
      60_000,
      now
    );

    expect(TokenAllowlistCacheService.isTokenAllowed(customToken, now + 10_000)).toBe(true);
    expect(TokenAllowlistCacheService.isTokenAllowed(customToken, now + 70_000)).toBe(false);
  });

  it('removes tokens upon explicit request', () => {
    const usdc = 'CAQCFVLOBK5GIULPNZCGATSTPCHLNBHHCEYLZTG2NOX7I2L46MDQH2XU';
    expect(TokenAllowlistCacheService.isTokenAllowed(usdc)).toBe(true);

    const removed = TokenAllowlistCacheService.removeToken(usdc);
    expect(removed).toBe(true);
    expect(TokenAllowlistCacheService.isTokenAllowed(usdc)).toBe(false);
  });

  it('clears expired tokens correctly', () => {
    const token1 = 'TOKEN_EXPIRED';
    const now = 2_000_000;
    TokenAllowlistCacheService.registerToken(token1, 'EXP', 7, undefined, 5_000, now);

    const pruned = TokenAllowlistCacheService.clearExpired(now + 10_000);
    expect(pruned).toBeGreaterThanOrEqual(1);
    expect(TokenAllowlistCacheService.isTokenAllowed(token1, now + 10_000)).toBe(false);
  });
});
