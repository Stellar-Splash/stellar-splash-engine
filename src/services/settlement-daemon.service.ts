import { SettlementJob, SettlementDaemonStats } from '../types/settlement-daemon';
import { CONFIG } from '../config';

export class SettlementDaemonService {
  private jobs: Map<number, SettlementJob> = new Map();
  private settledCount: number = 0;
  private disputedCount: number = 0;
  private failedCount: number = 0;
  private lastRunTimestamp: number = 0;
  private isPolling: boolean = false;
  private timer: NodeJS.Timeout | null = null;

  public registerCompletedTournament(
    tournamentId: number,
    endedAt: number = Date.now(),
    disputeWindowDurationMs: number = 3600_000 // 1 hour default
  ): SettlementJob {
    const existing = this.jobs.get(tournamentId);
    if (existing) return existing;

    const job: SettlementJob = {
      tournamentId,
      contractId: CONFIG.CONTRACT_ID,
      endedAt,
      disputeWindowExpiresAt: endedAt + disputeWindowDurationMs,
      status: 'PENDING_DISPUTE',
      attempts: 0,
    };

    this.jobs.set(tournamentId, job);
    return job;
  }

  public markDisputed(tournamentId: number, reason?: string): void {
    const job = this.jobs.get(tournamentId);
    if (job) {
      job.status = 'DISPUTED';
      job.error = reason || 'Tournament contested by participant';
      this.disputedCount++;
    }
  }

  public async evaluatePendingJobs(): Promise<SettlementJob[]> {
    this.lastRunTimestamp = Date.now();
    const readyJobs: SettlementJob[] = [];

    for (const job of this.jobs.values()) {
      if (job.status === 'PENDING_DISPUTE' && Date.now() >= job.disputeWindowExpiresAt) {
        job.status = 'READY_FOR_SETTLEMENT';
      }

      if (job.status === 'READY_FOR_SETTLEMENT') {
        job.status = 'PROCESSING';
        job.attempts++;
        job.lastAttemptAt = Date.now();

        try {
          // Trigger settlement simulation/execution
          job.txHash = `settled_tx_${job.tournamentId}_${Date.now()}`;
          job.status = 'SETTLED';
          this.settledCount++;
          readyJobs.push(job);
        } catch (err: any) {
          job.attempts++;
          if (job.attempts >= 3) {
            job.status = 'FAILED';
            job.error = err?.message || 'Settlement execution failed';
            this.failedCount++;
          } else {
            job.status = 'READY_FOR_SETTLEMENT';
          }
        }
      }
    }

    return readyJobs;
  }

  public getStats(): SettlementDaemonStats {
    let active = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'PENDING_DISPUTE' || job.status === 'READY_FOR_SETTLEMENT' || job.status === 'PROCESSING') {
        active++;
      }
    }

    return {
      activeJobsCount: active,
      settledCount: this.settledCount,
      disputedCount: this.disputedCount,
      failedCount: this.failedCount,
      lastRunTimestamp: this.lastRunTimestamp,
      isPolling: this.isPolling,
    };
  }

  public getJob(tournamentId: number): SettlementJob | undefined {
    return this.jobs.get(tournamentId);
  }

  public getAllJobs(): SettlementJob[] {
    return Array.from(this.jobs.values());
  }

  public startDaemon(intervalMs: number = 30_000): void {
    if (this.isPolling) return;
    this.isPolling = true;
    this.timer = setInterval(() => {
      this.evaluatePendingJobs().catch(() => {});
    }, intervalMs);
  }

  public stopDaemon(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isPolling = false;
  }
}

export const settlementDaemon = new SettlementDaemonService();
