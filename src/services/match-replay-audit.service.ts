import { createHash } from 'crypto';
import { StoreService } from './store.service';
import {
  MatchTickAnomalyService,
  AnomalyScanReport,
  MatchTickItem,
} from './match-tick-anomaly.service';
import { MatchSession, GameResult } from '../types';

export interface MatchAuditPackage {
  packageId: string;
  matchId: string;
  tournamentId: string;
  exportedAt: number;
  session: MatchSession | null;
  result: GameResult | null;
  anomalyAnalysis: AnomalyScanReport;
  packageChecksum: string;
}

/**
 * Service generating standalone forensic audit packages for contested matches.
 */
export class MatchReplayAuditService {
  /**
   * Generates a forensic diagnostic package for a match session.
   */
  public static generatePackage(
    matchId: string,
    now: number = Date.now()
  ): MatchAuditPackage {
    const session = StoreService.getMatchSession(matchId) || null;
    const result = StoreService.getGameResult(matchId) || null;

    const events = session?.events || [];
    const ticks: MatchTickItem[] = events.map((e, idx) => ({
      tickIndex: e.seq ?? idx,
      playerIndex: 0,
      action: e.type,
      timestamp: e.timestamp,
    }));

    const anomalyAnalysis = MatchTickAnomalyService.scanTicks(
      ticks,
      session?.endTime || now
    );

    const canonicalString = JSON.stringify({
      matchId,
      tournamentId: session?.tournamentId || 'unknown',
      session,
      result,
      anomalyAnalysis,
      exportedAt: now,
    });

    const packageChecksum = createHash('sha256').update(canonicalString).digest('hex');
    const packageId = `audit-pkg-${matchId}-${now}`;

    return {
      packageId,
      matchId,
      tournamentId: session?.tournamentId || 'unknown',
      exportedAt: now,
      session,
      result,
      anomalyAnalysis,
      packageChecksum,
    };
  }

  /**
   * Verifies the SHA-256 checksum of an audit package.
   */
  public static verifyPackageChecksum(pkg: MatchAuditPackage): boolean {
    const canonicalString = JSON.stringify({
      matchId: pkg.matchId,
      tournamentId: pkg.tournamentId,
      session: pkg.session,
      result: pkg.result,
      anomalyAnalysis: pkg.anomalyAnalysis,
      exportedAt: pkg.exportedAt,
    });

    const computed = createHash('sha256').update(canonicalString).digest('hex');
    return computed === pkg.packageChecksum;
  }
}
