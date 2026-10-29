export interface LedgerSyncStatus {
  isSynced: boolean;
  horizonLedgerSequence: number;
  sorobanLedgerSequence: number;
  sequenceLag: number;
  maxAllowedLag: number;
  lastCheckedAt: number;
  warning?: string;
}
