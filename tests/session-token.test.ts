import { describe, it, expect, beforeEach } from 'vitest';
import { SessionTokenService } from '../src/services/session-token.service';

describe('SessionTokenService', () => {
  beforeEach(() => {
    SessionTokenService.reset();
  });

  it('issues valid single-use tokens', () => {
    const session = SessionTokenService.issueToken('m-1', 't-1', 'GBBD...1');
    expect(session.token).toHaveLength(48); // 24 bytes hex
    expect(session.consumed).toBe(false);

    expect(SessionTokenService.isTokenValid(session.token)).toBe(true);
  });

  it('consumes token atomically and prevents reuse', () => {
    const session = SessionTokenService.issueToken('m-2', 't-2', 'GBBD...2');

    // First consumption succeeds
    const ok = SessionTokenService.verifyAndConsumeToken(session.token, 'm-2', 'GBBD...2');
    expect(ok).toBe(true);
    expect(SessionTokenService.isTokenValid(session.token)).toBe(false);

    // Second consumption rejected
    const replay = SessionTokenService.verifyAndConsumeToken(session.token, 'm-2', 'GBBD...2');
    expect(replay).toBe(false);
  });

  it('rejects consumption with mismatched matchId or playerWallet', () => {
    const session = SessionTokenService.issueToken('m-3', 't-3', 'GBBD...3');

    const wrongPlayer = SessionTokenService.verifyAndConsumeToken(
      session.token,
      'm-3',
      'WRONG_WALLET'
    );
    expect(wrongPlayer).toBe(false);

    const wrongMatch = SessionTokenService.verifyAndConsumeToken(
      session.token,
      'WRONG_MATCH',
      'GBBD...3'
    );
    expect(wrongMatch).toBe(false);
  });

  it('rejects expired tokens and prunes them', () => {
    const session = SessionTokenService.issueToken('m-4', 't-4', 'GBBD...4', 5_000, 1000);

    expect(SessionTokenService.isTokenValid(session.token, 7000)).toBe(false);

    const pruned = SessionTokenService.pruneExpired(7000);
    expect(pruned).toBe(1);
  });
});
