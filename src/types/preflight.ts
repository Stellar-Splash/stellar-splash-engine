export interface PreflightSimulationRequest {
  transactionXdr: string;
}

export interface PreflightSimulationResult {
  success: boolean;
  minResourceFeeStroops: string;
  cpuInstructions: number;
  memoryBytes: number;
  costEstimateXlm: string;
  eventsCount: number;
  error?: string;
  simulatedAt: number;
}

