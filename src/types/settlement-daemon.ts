export interface SettlementJob {
  tournamentId: number;
  contractId: string;
  endedAt: number;
  disputeWindowExpiresAt: number;
  status: 'PENDING_DISPUTE' | 'READY_FOR_SETTLEMENT' | 'PROCESSING' | 'SETTLED' | 'DISPUTED' | 'FAILED';
  txHash?: string;
  error?: string;
  attempts: number;
  lastAttemptAt?: number;
}

export interface SettlementDaemonStats {
  activeJobsCount: number;
  settledCount: number;
  disputedCount: number;
  failedCount: number;
  lastRunTimestamp: number;
  isPolling: boolean;
}
