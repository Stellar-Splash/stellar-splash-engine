export interface ChannelAccount {
  publicKey: string;
  secretKey: string;
  isLocked: boolean;
  lastSequenceNumber?: string;
  lastUsedAt?: number;
  balanceStroops?: string;
}

export interface SubmissionQueueItem {
  id: string;
  tournamentId: number;
  transactionXdr: string;
  action: 'fund' | 'register' | 'authorize' | 'settle' | 'sponsor' | 'dispute';
  enqueuedAt: number;
  status: 'pending' | 'simulating' | 'submitting' | 'confirmed' | 'failed';
  attempts: number;
  error?: string;
  txHash?: string;
}

export interface ChannelAccountMetrics {
  totalChannels: number;
  availableChannels: number;
  busyChannels: number;
  queueDepth: number;
}

