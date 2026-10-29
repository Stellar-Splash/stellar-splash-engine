import { createHash } from 'crypto';
import { StoreService } from './store.service';
import { Tournament, FinalRankingRecord, SettlementRecord } from '../types';

export interface AuditExportReport {
  reportId: string;
  tournamentId: string;
  generatedAt: number;
  integrityHash: string;
  tournament: Tournament | null;
  ranking: FinalRankingRecord | null;
  settlement: SettlementRecord | null;
  auditTrail: Array<{
    id: string;
    timestamp: number;
    eventType: string;
    actor: string;
    details: Record<string, unknown>;
  }>;
}

/**
 * Service generating tamper-evident audit reports for regulatory and player verification.
 */
export class AuditExportService {
  /**
   * Generates a verifiable audit export report for a tournament.
   */
  public static generateReport(
    tournamentId: string,
    generatedAt: number = Date.now()
  ): AuditExportReport {
    const tournament = StoreService.getTournamentById(tournamentId) || null;
    const ranking = StoreService.getRanking(tournamentId) || null;
    const settlement = StoreService.getSettlementByTournament(tournamentId) || null;

    // Filter audit logs for this specific tournament
    const auditTrail = StoreService.getAuditLogs().filter((log) => {
      const details = log.details as Record<string, unknown> | undefined;
      return (
        details?.tournamentId === tournamentId ||
        details?.sourceTournamentId === tournamentId ||
        details?.newTournamentId === tournamentId
      );
    });

    const canonicalPayload = JSON.stringify({
      tournamentId,
      generatedAt,
      tournament,
      ranking,
      settlement,
      auditTrail,
    });

    const integrityHash = createHash('sha256').update(canonicalPayload).digest('hex');
    const reportId = `audit-rep-${tournamentId}-${generatedAt}`;

    return {
      reportId,
      tournamentId,
      generatedAt,
      integrityHash,
      tournament,
      ranking,
      settlement,
      auditTrail,
    };
  }

  /**
   * Verifies the integrity hash of an audit report.
   */
  public static verifyReportIntegrity(report: AuditExportReport): boolean {
    const canonicalPayload = JSON.stringify({
      tournamentId: report.tournamentId,
      generatedAt: report.generatedAt,
      tournament: report.tournament,
      ranking: report.ranking,
      settlement: report.settlement,
      auditTrail: report.auditTrail,
    });

    const calculatedHash = createHash('sha256').update(canonicalPayload).digest('hex');
    return calculatedHash === report.integrityHash;
  }
}
