export interface ForensicReplayPackage {
  matchId: string;
  tournamentId: number;
  playerWallets: string[];
  gameTitle: string;
  seed: number;
  tickCount: number;
  finalScores: Record<string, number>;
  verificationHash: string;
  serverAttestationSignature: string;
  antiCheatVerdict: {
    isFlagged: boolean;
    reasons: string[];
  };
  packagedAt: number;
  packageVersion: '1.0.0';
}
