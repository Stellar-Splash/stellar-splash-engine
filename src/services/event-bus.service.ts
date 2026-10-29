import { Response } from 'express';

export type PlatformEventType =
  | 'TOURNAMENT_CREATED'
  | 'PRIZE_POOL_FUNDED'
  | 'TOURNAMENT_OPENED'
  | 'TOURNAMENT_FINALIZED'
  | 'PLAYER_JOINED'
  | 'MATCH_STARTED'
  | 'MATCH_COMPLETED'
  | 'MATCH_VERIFIED'
  | 'LEADERBOARD_UPDATED'
  | 'RECONCILIATION_UPDATED'
  | 'AGREEMENT_CREATED'
  | 'AGREEMENT_APPROVED'
  | 'AGREEMENT_LOCKED'
  | 'RANKING_FINALIZED'
  | 'SETTLEMENT_CREATED'
  | 'SETTLEMENT_AUTHORIZED'
  | 'SETTLEMENT_SUBMITTED'
  | 'SETTLEMENT_CONFIRMED'
  | 'SETTLEMENT_RECONCILED'
  | 'SETTLEMENT_FAILED'
  | 'SETTLEMENT_PARTIALLY_SETTLED';

export interface PlatformEventPayload {
  type: PlatformEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export class EventBusService {
  private static subscribers: Set<Response> = new Set();
  private static heartbeatTimer: NodeJS.Timeout | null = null;

  /**
   * Registers a new SSE client connection and ensures the heartbeat loop is active.
   */
  public static addSubscriber(res: Response): void {
    this.subscribers.add(res);

    if (!this.heartbeatTimer) {
      this.startHeartbeat();
    }
  }

  /**
   * Removes an SSE client connection and cleans up heartbeat timer when empty.
   */
  public static removeSubscriber(res: Response): void {
    this.subscribers.delete(res);

    if (this.subscribers.size === 0 && this.heartbeatTimer) {
      this.stopHeartbeat();
    }
  }

  /**
   * Returns current count of connected SSE subscribers.
   */
  public static getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Starts periodic SSE heartbeat keepalive ping to prevent proxy/load-balancer timeouts.
   */
  public static startHeartbeat(intervalMs = 15000): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      const ping = `: ping - ${Date.now()}\n\n`;
      for (const client of this.subscribers) {
        try {
          client.write(ping);
        } catch {
          this.subscribers.delete(client);
        }
      }
    }, intervalMs);

    // Allow process to exit cleanly if only heartbeat timer is remaining
    if (this.heartbeatTimer.unref) {
      this.heartbeatTimer.unref();
    }
  }

  /**
   * Halts the heartbeat timer.
   */
  public static stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Broadcasts a typed platform event to all active SSE subscribers.
   */
  public static broadcast(type: PlatformEventType, data: Record<string, unknown>): void {
    const payload: PlatformEventPayload = {
      type,
      timestamp: Date.now(),
      data,
    };

    const message = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const client of this.subscribers) {
      try {
        client.write(message);
      } catch {
        this.subscribers.delete(client);
      }
    }
  }
}
