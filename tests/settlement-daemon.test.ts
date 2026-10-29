import { describe, it, expect, beforeEach } from 'vitest';
import { SettlementDaemonService } from '../src/services/settlement-daemon.service';

describe('SettlementDaemonService', () => {
  let daemon: SettlementDaemonService;

  beforeEach(() => {
    daemon = new SettlementDaemonService();
  });

  it('registers completed tournament with dispute window', () => {
    const job = daemon.registerCompletedTournament(42, 1000, 3600_000);
    expect(job.tournamentId).toBe(42);
    expect(job.status).toBe('PENDING_DISPUTE');
    expect(job.disputeWindowExpiresAt).toBe(1000 + 3600_000);

    const stats = daemon.getStats();
    expect(stats.activeJobsCount).toBe(1);
    expect(stats.settledCount).toBe(0);
  });

  it('executes settlement when dispute window has elapsed', async () => {
    // Window ended 1000ms ago
    const endedAt = Date.now() - 5000;
    const windowDuration = 1000;
    daemon.registerCompletedTournament(43, endedAt, windowDuration);

    const settled = await daemon.evaluatePendingJobs();
    expect(settled).toHaveLength(1);
    expect(settled[0].status).toBe('SETTLED');
    expect(settled[0].txHash).toBeDefined();

    const stats = daemon.getStats();
    expect(stats.settledCount).toBe(1);
    expect(stats.activeJobsCount).toBe(0);
  });

  it('halts settlement when tournament is disputed', async () => {
    daemon.registerCompletedTournament(44, Date.now() - 5000, 1000);
    daemon.markDisputed(44, 'Contested winner rank');

    const job = daemon.getJob(44);
    expect(job?.status).toBe('DISPUTED');
    expect(job?.error).toContain('Contested winner');

    const settled = await daemon.evaluatePendingJobs();
    expect(settled).toHaveLength(0);

    const stats = daemon.getStats();
    expect(stats.disputedCount).toBe(1);
    expect(stats.settledCount).toBe(0);
  });
});
