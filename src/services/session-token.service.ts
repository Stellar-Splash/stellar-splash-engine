import { randomBytes } from 'crypto';
import { SessionToken } from '../types/session-token';

export { SessionToken };

/**
 * Service managing single-use cryptographic session tokens to prevent
 * replay attacks and duplicate match submissions.
 */
export class SessionTokenService {
  private static readonly DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
  private static tokens: Map<string, SessionToken> = new Map();

  /**
   * Resets internal token store (used in unit testing).
   */
  public static reset(): void {
    this.tokens.clear();
  }

  /**
   * Issues a new single-use match session token.
   */
  public static issueToken(
    matchId: string,
    tournamentId: string,
    playerWallet: string,
    ttlMs: number = this.DEFAULT_TTL_MS,
    issuedAt: number = Date.now()
  ): SessionToken {
    const token = randomBytes(24).toString('hex');
    const sessionToken: SessionToken = {
      token,
      matchId,
      tournamentId,
      playerWallet,
      issuedAt,
      expiresAt: issuedAt + ttlMs,
      consumed: false,
    };

    this.tokens.set(token, sessionToken);
    return sessionToken;
  }

  /**
   * Validates a token without consuming it.
   */
  public static isTokenValid(tokenString: string, currentTime: number = Date.now()): boolean {
    const session = this.tokens.get(tokenString);
    if (!session) return false;
    if (session.consumed) return false;
    if (currentTime > session.expiresAt) return false;
    return true;
  }

  /**
   * Verifies token matches target match/player and consumes it atomically.
   */
  public static verifyAndConsumeToken(
    tokenString: string,
    matchId: string,
    playerWallet: string,
    currentTime: number = Date.now()
  ): boolean {
    const session = this.tokens.get(tokenString);
    if (!session) return false;
    if (session.consumed) return false;
    if (currentTime > session.expiresAt) return false;
    if (session.matchId !== matchId || session.playerWallet !== playerWallet) return false;

    session.consumed = true;
    this.tokens.set(tokenString, session);
    return true;
  }

  /**
   * Prunes all expired or consumed tokens from memory.
   */
  public static pruneExpired(currentTime: number = Date.now()): number {
    let pruned = 0;
    for (const [key, session] of this.tokens.entries()) {
      if (session.consumed || currentTime > session.expiresAt) {
        this.tokens.delete(key);
        pruned++;
      }
    }
    return pruned;
  }
}
