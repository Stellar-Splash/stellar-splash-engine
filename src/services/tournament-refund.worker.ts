import { StoreService } from './store.service';
import { EventBusService } from './event-bus.service';
import { WebhookService } from './webhook.service';
import { Tournament } from '../types';

export interface RefundResult {
  tournamentId: string;
  creatorWallet: string;
  refundAmount: number;
  prizeAsset: string;
  reason: string;
  processedAt: number;
}

/**
 * Automated worker identifying cancelled or under-subscribed tournaments with
 * idle escrowed prize pool balances and dispatching refund events.
 */
export class TournamentRefundWorker {
  private static timer: NodeJS.Timeout | null = null;
  private static running: boolean = false;
  private static processedRefunds: Set<string> = new Set();

  /**
   * Resets internal in-memory tracker (used in unit tests).
   */
  public static reset(): void {
    this.processedRefunds.clear();
    this.stop();
  }

  /**
   * Scans for tournaments eligible for refunds:
   * 1. State is 'CANCELLED'
   * 2. State is 'FINALIZED' but participants is 0 (uncontested)
   * 3. Has unspent prizePoolAmount > 0 and has not yet been refunded
   */
  public static processPendingRefunds(currentTime: number = Date.now()): RefundResult[] {
    const tournaments = StoreService.getAllTournaments();
    const refunds: RefundResult[] = [];

    for (const t of tournaments) {
      if (this.processedRefunds.has(t.id)) {
        continue;
      }

      const isCancelled = t.state === 'CANCELLED';
      const isUncontested = t.state === 'FINALIZED' && (t.currentParticipants === 0 || !t.currentParticipants);

      if ((isCancelled || isUncontested) && t.prizePoolAmount > 0) {
        const reason = isCancelled ? 'TOURNAMENT_CANCELLED' : 'ZERO_PARTICIPANTS_UNCONTESTED';

        const result: RefundResult = {
          tournamentId: t.id,
          creatorWallet: t.creatorWallet,
          refundAmount: t.prizePoolAmount,
          prizeAsset: t.prizeAsset,
          reason,
          processedAt: currentTime,
        };

        this.processedRefunds.add(t.id);
        refunds.push(result);

        // Broadcast platform SSE event
        EventBusService.broadcast('TOURNAMENT_FINALIZED', {
          tournamentId: t.id,
          action: 'REFUND_DISPATCHED',
          refundAmount: t.prizePoolAmount,
          recipient: t.creatorWallet,
          reason,
        });

        // Fire outbound webhook
        WebhookService.dispatch('tournament.created', {
          event: 'tournament.refund_issued',
          tournamentId: t.id,
          recipient: t.creatorWallet,
          amount: t.prizePoolAmount,
          asset: t.prizeAsset,
          reason,
        }).catch(() => {
          // Non-blocking webhook dispatch
        });

        // Audit log
        StoreService.logAudit('TOURNAMENT_REFUND_PROCESSED', 'refund-worker', {
          tournamentId: t.id,
          recipient: t.creatorWallet,
          amount: t.prizePoolAmount,
          reason,
        });
      }
    }

    return refunds;
  }

  /**
   * Starts periodic polling worker.
   */
  public static start(intervalMs: number = 20_000): void {
    if (this.running) return;

    this.running = true;
    this.timer = setInterval(() => {
      try {
        this.processPendingRefunds();
      } catch (err) {
        console.error('Error during tournament refund cycle', err);
      }
    }, intervalMs);

    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  /**
   * Stops the background worker.
   */
  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
  }
}
