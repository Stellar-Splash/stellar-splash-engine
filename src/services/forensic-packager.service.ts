import crypto from 'crypto';
import { ForensicReplayPackage } from '../types/forensic-packager';

export class ForensicPackagerService {
  private static packages: Map<string, ForensicReplayPackage> = new Map();

  public static assemblePackage(params: {
    matchId: string;
    tournamentId: number;
    playerWallets: string[];
    gameTitle: string;
    seed: number;
    tickCount: number;
    finalScores: Record<string, number>;
    isFlagged: boolean;
    antiCheatReasons: string[];
    signingSecret?: string;
  }): ForensicReplayPackage {
    const rawPayload = `${params.matchId}:${params.tournamentId}:${params.seed}:${params.tickCount}:${JSON.stringify(params.finalScores)}`;
    const verificationHash = crypto.createHash('sha256').update(rawPayload).digest('hex');

    const secret = params.signingSecret || 'STELLAR_SPLASH_FORENSIC_AUTHORITY_SECRET';
    const serverAttestationSignature = crypto
      .createHmac('sha256', secret)
      .update(verificationHash)
      .digest('hex');

    const pkg: ForensicReplayPackage = {
      matchId: params.matchId,
      tournamentId: params.tournamentId,
      playerWallets: params.playerWallets,
      gameTitle: params.gameTitle,
      seed: params.seed,
      tickCount: params.tickCount,
      finalScores: params.finalScores,
      verificationHash,
      serverAttestationSignature,
      antiCheatVerdict: {
        isFlagged: params.isFlagged,
        reasons: params.antiCheatReasons,
      },
      packagedAt: Date.now(),
      packageVersion: '1.0.0',
    };

    this.packages.set(params.matchId, pkg);
    return pkg;
  }

  public static getPackage(matchId: string): ForensicReplayPackage | undefined {
    return this.packages.get(matchId);
  }

  public static verifyPackageIntegrity(pkg: ForensicReplayPackage, secret: string = 'STELLAR_SPLASH_FORENSIC_AUTHORITY_SECRET'): boolean {
    const rawPayload = `${pkg.matchId}:${pkg.tournamentId}:${pkg.seed}:${pkg.tickCount}:${JSON.stringify(pkg.finalScores)}`;
    const expectedHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
    if (expectedHash !== pkg.verificationHash) return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(expectedHash)
      .digest('hex');

    return expectedSignature === pkg.serverAttestationSignature;
  }
}
