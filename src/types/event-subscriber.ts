export interface SorobanContractEvent {
  id: string;
  type: string;
  ledger: number;
  ledgerClosedAt: string;
  contractId: string;
  topic: string[];
  value: any;
  inSuccessfulContractCall: boolean;
}

export interface EventFilterCriteria {
  startLedger?: number;
  contractIds?: string[];
  topics?: string[][];
  limit?: number;
}

