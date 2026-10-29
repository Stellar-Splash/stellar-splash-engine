export interface TokenMetadata {
  address: string;
  symbol: string;
  decimals: number;
  issuer?: string;
  cachedAt: number;
  expiresAt: number;
}

/**
 * High-performance TTL cache service for verified Stellar asset trustlines
 * and Soroban token contracts authorized for tournament entry fees and prize pools.
 */
export class TokenAllowlistCacheService {
  private static readonly DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
  private static cache: Map<string, TokenMetadata> = new Map();

  // Known default testnet tokens
  private static readonly DEFAULT_TOKENS: Array<Omit<TokenMetadata, 'cachedAt' | 'expiresAt'>> = [
    {
      address: 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA',
      symbol: 'XLM',
      decimals: 7,
    },
    {
      address: 'CAQCFVLOBK5GIULPNZCGATSTPCHLNBHHCEYLZTG2NOX7I2L46MDQH2XU',
      symbol: 'USDC',
      decimals: 7,
    },
    {
      address: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWUIE3USCIHZXWH65SC',
      symbol: 'AQUA',
      decimals: 7,
    },
  ];

  static {
    this.seedDefaults();
  }

  /**
   * Resets cache and reseeds standard testnet token definitions.
   */
  public static reset(): void {
    this.cache.clear();
    this.seedDefaults();
  }

  private static seedDefaults(): void {
    const now = Date.now();
    for (const token of this.DEFAULT_TOKENS) {
      this.cache.set(token.address, {
        ...token,
        cachedAt: now,
        expiresAt: now + 365 * 24 * 60 * 60 * 1000, // 1 year for defaults
      });
    }
  }

  /**
   * Checks whether a token contract is authorized and unexpired.
   */
  public static isTokenAllowed(address: string, currentTime: number = Date.now()): boolean {
    const entry = this.cache.get(address);
    if (!entry) return false;
    if (currentTime > entry.expiresAt) {
      this.cache.delete(address);
      return false;
    }
    return true;
  }

  /**
   * Registers or updates an authorized token in the cache.
   */
  public static registerToken(
    address: string,
    symbol: string,
    decimals: number,
    issuer?: string,
    ttlMs: number = this.DEFAULT_TTL_MS,
    currentTime: number = Date.now()
  ): TokenMetadata {
    const metadata: TokenMetadata = {
      address,
      symbol,
      decimals,
      issuer,
      cachedAt: currentTime,
      expiresAt: currentTime + ttlMs,
    };
    this.cache.set(address, metadata);
    return metadata;
  }

  /**
   * Retrieves metadata for an authorized token.
   */
  public static getTokenMetadata(address: string, currentTime: number = Date.now()): TokenMetadata | null {
    if (!this.isTokenAllowed(address, currentTime)) {
      return null;
    }
    return this.cache.get(address) || null;
  }

  /**
   * Returns all currently valid authorized tokens.
   */
  public static getAllowedTokens(currentTime: number = Date.now()): TokenMetadata[] {
    const valid: TokenMetadata[] = [];
    for (const [address, meta] of this.cache.entries()) {
      if (currentTime <= meta.expiresAt) {
        valid.push(meta);
      } else {
        this.cache.delete(address);
      }
    }
    return valid;
  }

  /**
   * Removes a token from the allowlist.
   */
  public static removeToken(address: string): boolean {
    return this.cache.delete(address);
  }

  /**
   * Prunes all expired tokens from cache. Returns count of pruned entries.
   */
  public static clearExpired(currentTime: number = Date.now()): number {
    let pruned = 0;
    for (const [address, meta] of this.cache.entries()) {
      if (currentTime > meta.expiresAt) {
        this.cache.delete(address);
        pruned++;
      }
    }
    return pruned;
  }
}
