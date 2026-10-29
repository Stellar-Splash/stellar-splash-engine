import { StoreService } from './store.service';
import { EventBusService } from './event-bus.service';
import { ShutdownService } from './shutdown.service';
import { Tournament } from '../types';

/**
 * Background worker service that monitors time-bounded tournaments and automatically
 * finalizes tournaments whose cutoff end_time has elapsed.
 */
export class TournamentExpirationWorker {
  private static timer: NodeJS.Timeout | null = null;
  private static running: boolean = false;

  /**
   * Scans all stored tournaments and transitions overdue active tournaments to FINALIZED state.
   * @param currentTime Optional override timestamp for deterministic testing.
   * @returns Array of tournaments that were transitioned during this evaluation pass.
   */
  public static checkExpiredTournaments(currentTime: number = Date.now()): Tournament[] {
    const tournaments = StoreService.getAllTournaments();
    const finalized: Tournament[] = [];

    const activeStates: Array<Tournament['state']> = ['OPEN', 'FULL', 'IN_PROGRESS', 'FUNDING'];

    for (const t of tournaments) {
      if (activeStates.includes(t.state) && t.endTime <= currentTime) {
        t.state = 'FINALIZED';
        t.updatedAt = currentTime;
        StoreService.saveTournament(t);

        EventBusService.broadcast('TOURNAMENT_FINALIZED', {
          tournamentId: t.id,
          name: t.name,
          finalizedAt: currentTime,
          reason: 'CUTOFF_TIME_ELAPSED',
        });

        StoreService.logAudit('TOURNAMENT_FINALIZED_BY_EXPIRATION_WORKER', 'system', {
          tournamentId: t.id,
          cutoffEndTime: t.endTime,
          finalizedAt: currentTime,
        });

        finalized.push(t);
      }
    }

    return finalized;
  }

  /**
   * Starts the periodic background cron worker.
   */
  public static start(intervalMs: number = 15_000): void {
    if (this.running) return;

    this.running = true;
    this.timer = setInterval(() => {
      try {
        this.checkExpiredTournaments();
      } catch (err) {
        console.error('Error during tournament expiration check:', err);
      }
    }, intervalMs);

    // Register with graceful shutdown service
    ShutdownService.registerHook('tournament-expiration-worker', async () => {
      TournamentExpirationWorker.stop();
    });
  }

  /**
   * Stops the background worker and clears timer intervals.
   */
  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
  }

  public static isRunning(): boolean {
    return this.running;
  }
}
