import { describe, it, expect, beforeEach } from 'vitest';
import { StoreService } from '../src/services/store.service';
import { DatabaseCompactionService } from '../src/services/db-compaction.service';
import { MatchSession } from '../src/types';

describe('DatabaseCompactionService', () => {
  beforeEach(() => {
    StoreService.reset();
  });

  it('prunes expired audit logs while keeping fresh entries', () => {
    const now = Date.now();
    const tenDaysAgo = now - 10 * 86400 * 1000;
    const fortyDaysAgo = now - 40 * 86400 * 1000;

    StoreService.logAudit('RECENT_ACTION', 'GA_USER_1', { data: 1 }, tenDaysAgo);
    StoreService.logAudit('OLD_ACTION', 'GA_USER_2', { data: 2 }, fortyDaysAgo);

    const report = DatabaseCompactionService.compact(
      { auditLogRetentionMs: 30 * 86400 * 1000 },
      now
    );

    expect(report.prunedAuditLogs).toBe(1);
    const currentLogs = StoreService.getAuditLogs();
    expect(currentLogs.some((l) => l.eventType === 'OLD_ACTION')).toBe(false);
    expect(currentLogs.some((l) => l.eventType === 'RECENT_ACTION')).toBe(true);
    expect(currentLogs.some((l) => l.eventType === 'DB_COMPACTION')).toBe(true);
  });

  it('prunes abandoned draft matches while preserving completed matches', () => {
    const now = Date.now();
    const twoDaysAgo = now - 2 * 86400 * 1000;

    const staleDraft: MatchSession = {
      matchId: 'stale-match-1',
      tournamentId: 't-1',
      playerWallet: 'GA_1',
      gameId: 'splash-rush',
      gameVersion: '1.0.0',
      sessionToken: 'token-1',
      status: 'PLAYING',
      startTime: twoDaysAgo,
    };

    const completedMatch: MatchSession = {
      matchId: 'completed-match-2',
      tournamentId: 't-1',
      playerWallet: 'GA_2',
      gameId: 'splash-rush',
      gameVersion: '1.0.0',
      sessionToken: 'token-2',
      status: 'COMPLETED',
      startTime: twoDaysAgo,
      endTime: twoDaysAgo + 60000,
    };

    StoreService.createMatchSession(staleDraft);
    StoreService.createMatchSession(completedMatch);

    const report = DatabaseCompactionService.compact(
      { staleDraftMatchRetentionMs: 86400 * 1000 },
      now
    );

    expect(report.prunedStaleMatches).toBe(1);
    expect(StoreService.getMatchSession('stale-match-1')).toBeUndefined();
    expect(StoreService.getMatchSession('completed-match-2')).toBeDefined();
  });
});
