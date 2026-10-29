import { LedgerSyncStatus } from '../types/ledger-sync';
import { CONFIG } from '../config';

export class LedgerSequenceSyncService {
  private horizonUrl: string;
  private rpcUrl: string;
  private maxAllowedLag: number = 3;

  constructor(
    horizonUrl: string = CONFIG.HORIZON_URL,
    rpcUrl: string = CONFIG.SOROBAN_RPC_URL
  ) {
    this.horizonUrl = horizonUrl;
    this.rpcUrl = rpcUrl;
  }

  public async fetchHorizonLedger(): Promise<number> {
    try {
      const res = await fetch(`${this.horizonUrl}/ledgers?order=desc&limit=1`);
      if (!res.ok) return 0;
      const data = (await res.json()) as any;
      const records = data?._embedded?.records;
      if (Array.isArray(records) && records.length > 0) {
        return parseInt(records[0].sequence) || 0;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  public async fetchSorobanLedger(): Promise<number> {
    try {
      const res = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getLatestLedger',
        }),
      });
      if (!res.ok) return 0;
      const data = (await res.json()) as any;
      return data?.result?.sequence || 0;
    } catch {
      return 0;
    }
  }

  public async checkSync(): Promise<LedgerSyncStatus> {
    const [horizonSeq, sorobanSeq] = await Promise.all([
      this.fetchHorizonLedger(),
      this.fetchSorobanLedger(),
    ]);

    const lag = Math.abs(horizonSeq - sorobanSeq);
    const isSynced = horizonSeq > 0 && sorobanSeq > 0 && lag <= this.maxAllowedLag;

    let warning: string | undefined;
    if (horizonSeq === 0 || sorobanSeq === 0) {
      warning = 'Failed to fetch ledger sequence from one or more providers';
    } else if (lag > this.maxAllowedLag) {
      warning = `Ledger sequence lag of ${lag} exceeds maximum allowed lag threshold of ${this.maxAllowedLag}`;
    }

    return {
      isSynced,
      horizonLedgerSequence: horizonSeq,
      sorobanLedgerSequence: sorobanSeq,
      sequenceLag: lag,
      maxAllowedLag: this.maxAllowedLag,
      lastCheckedAt: Date.now(),
      warning,
    };
  }
}

export const ledgerSequenceSync = new LedgerSequenceSyncService();
