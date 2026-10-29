export interface UpgradeRecord {
  version: number;
  wasmHash: string;
  admin: string;
  ledger: number;
  protocolVersion: number;
  timestamp: number;
}

/**
 * Service tracking on-chain Soroban WASM contract upgrades and version history.
 */
export class ContractUpgradeTrackerService {
  private static history: UpgradeRecord[] = [];

  static {
    // Seed initial v1 deployment
    this.history.push({
      version: 1,
      wasmHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      admin: 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB',
      ledger: 4800000,
      protocolVersion: 21,
      timestamp: Date.now() - 86400 * 1000 * 14,
    });
  }

  /**
   * Resets internal history and restores initial v1 baseline (used in testing).
   */
  public static reset(): void {
    this.history = [
      {
        version: 1,
        wasmHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        admin: 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB',
        ledger: 4800000,
        protocolVersion: 21,
        timestamp: Date.now() - 86400 * 1000 * 14,
      },
    ];
  }

  /**
   * Records an on-chain WASM contract upgrade.
   */
  public static recordUpgrade(
    wasmHash: string,
    admin: string,
    ledger: number,
    protocolVersion: number = 21,
    timestamp: number = Date.now()
  ): UpgradeRecord {
    const nextVersion = this.history.length + 1;
    const record: UpgradeRecord = {
      version: nextVersion,
      wasmHash,
      admin,
      ledger,
      protocolVersion,
      timestamp,
    };

    this.history.push(record);
    return record;
  }

  /**
   * Retrieves latest verified contract upgrade record.
   */
  public static getLatestUpgrade(): UpgradeRecord | null {
    if (this.history.length === 0) return null;
    return this.history[this.history.length - 1];
  }

  /**
   * Retrieves full chronological upgrade history.
   */
  public static getUpgradeHistory(): UpgradeRecord[] {
    return [...this.history];
  }

  /**
   * Checks whether a WASM bytecode hash is registered in the upgrade history.
   */
  public static isKnownWasmHash(wasmHash: string): boolean {
    return this.history.some((h) => h.wasmHash.toLowerCase() === wasmHash.toLowerCase());
  }
}
