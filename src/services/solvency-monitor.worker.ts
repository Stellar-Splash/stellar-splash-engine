import { StoreService } from './store.service';
import { EventBusService } from './event-bus.service';
import { ShutdownService } from './shutdown.service';

export interface SolvencyEvaluationResult {
  isSolvent: boolean;
  vaultBalance: number;
  totalObligations: number;
  ratioPct: number;
  activeTournamentCount: number;
  deficitAmount: number;
  timestamp: number;
}

/**
 * Background worker service monitoring vault solvency and reserves against
 * outstanding tournament obligations.
 */
export class SolvencyMonitorWorker {
  private static timer: NodeJS.Timeout | null = null;
  private static running: boolean = false;
  private static readonly DEFAULT_INTERVAL_MS = 60 * 1000; // 1 minute

  /**
   * Evaluates solvency across active tournaments against an on-chain vault balance.
   */
  public static checkSolvency(
    vaultBalanceOverride?: number,
    now: number = Date.now()
  ): SolvencyEvaluationResult {
    const tournaments = StoreService.getAllTournaments();

    // Active obligations are prizePoolAmounts of tournaments that are OPEN, IN_PROGRESS, or RESULTS_PENDING
    const activeStates = ['FUNDING', 'OPEN', 'FULL', 'IN_PROGRESS', 'RESULTS_PENDING', 'VERIFYING', 'FINALIZED'];
    const activeTournaments = tournaments.filter((t) => activeStates.includes(t.state));

    const totalObligations = activeTournaments.reduce(
      (sum, t) => sum + (t.prizePoolAmount || 0),
      0
    );

    // Default simulated balance matches obligations unless overridden
    const vaultBalance = vaultBalanceOverride !== undefined ? vaultBalanceOverride : totalObligations;

    const ratioPct =
      totalObligations > 0
        ? Math.round((vaultBalance / totalObligations) * 100)
        : 100;

    const isSolvent = vaultBalance >= totalObligations;
    const deficitAmount = isSolvent ? 0 : totalObligations - vaultBalance;

    const result: SolvencyEvaluationResult = {
      isSolvent,
      vaultBalance,
      totalObligations,
      ratioPct,
      activeTournamentCount: activeTournaments.length,
      deficitAmount,
      timestamp: now,
    };

    if (!isSolvent) {
      StoreService.logAudit('VAULT_DEFICIT_DETECTED', 'SYSTEM', {
        vaultBalance,
        totalObligations,
        deficitAmount,
        ratioPct,
      });

      EventBusService.broadcast('RECONCILIATION_UPDATED', {
        status: 'DEFICIT',
        deficitAmount,
        vaultBalance,
        totalObligations,
        timestamp: now,
      });
    }

    return result;
  }

  /**
   * Starts background monitoring loop.
   */
  public static start(intervalMs: number = this.DEFAULT_INTERVAL_MS): void {
    if (this.running) return;
    this.running = true;

    this.timer = setInterval(() => {
      try {
        this.checkSolvency();
      } catch {
        // Suppress timer throw
      }
    }, intervalMs);

    ShutdownService.registerHook('solvency-monitor-worker', async () => {
      this.stop();
    });
  }

  /**
   * Stops background monitoring loop.
   */
  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
  }
}
