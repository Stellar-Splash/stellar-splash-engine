import { StoreService } from './store.service';

export interface CompactionOptions {
  auditLogRetentionMs?: number; // e.g. 30 days
  staleDraftMatchRetentionMs?: number; // e.g. 24 hours
}

export interface CompactionReport {
  prunedAuditLogs: number;
  prunedStaleMatches: number;
  freedBytesEstimate: number;
  compactedAt: number;
}

/**
 * Service managing automated database compaction and cold log pruning.
 */
export class DatabaseCompactionService {
  private static readonly DEFAULT_AUDIT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
  private static readonly DEFAULT_DRAFT_RETENTION_MS = 24 * 60 * 60 * 1000;

  /**
   * Executes database compaction pruning stale temporary records.
   */
  public static compact(
    options: CompactionOptions = {},
    now: number = Date.now()
  ): CompactionReport {
    const auditRetention = options.auditLogRetentionMs ?? this.DEFAULT_AUDIT_RETENTION_MS;
    const draftRetention = options.staleDraftMatchRetentionMs ?? this.DEFAULT_DRAFT_RETENTION_MS;

    const auditCutoff = now - auditRetention;
    const draftCutoff = now - draftRetention;

    const state = StoreService.exportAll();

    // 1. Prune old audit logs
    const initialAuditCount = (state.auditLogs || []).length;
    const retainedAuditLogs = (state.auditLogs || []).filter(
      (log: any) => log.timestamp >= auditCutoff
    );
    const prunedAuditLogs = initialAuditCount - retainedAuditLogs.length;

    // 2. Prune old unverified/abandoned draft matches
    const initialMatchesCount = (state.matches || []).length;
    const retainedMatches = (state.matches || []).filter((m: any) => {
      const isDraft = m.status === 'CREATED' || m.status === 'PLAYING';
      if (isDraft && m.startTime < draftCutoff) {
        return false;
      }
      return true;
    });
    const prunedStaleMatches = initialMatchesCount - retainedMatches.length;

    // Apply retained state
    state.auditLogs = retainedAuditLogs;
    state.matches = retainedMatches;
    StoreService.importAll(state);

    // Estimate bytes freed (rough average of 256 bytes per record)
    const freedBytesEstimate = (prunedAuditLogs + prunedStaleMatches) * 256;

    // Log the maintenance action
    StoreService.logAudit('DB_COMPACTION', 'SYSTEM', {
      prunedAuditLogs,
      prunedStaleMatches,
      freedBytesEstimate,
      compactedAt: now,
    });

    return {
      prunedAuditLogs,
      prunedStaleMatches,
      freedBytesEstimate,
      compactedAt: now,
    };
  }
}
