export interface FriendbotFundingRequest {
  destination: string;
}

export interface FriendbotFundingResult {
  success: boolean;
  destination: string;
  txHash?: string;
  error?: string;
  fundedAt: number;
}

