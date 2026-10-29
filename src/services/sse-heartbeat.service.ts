import { Response } from 'express';

export interface SseClientSession {
  id: string;
  res: Response;
  connectedAt: number;
  lastPingAt: number;
  pingsSent: number;
  ip?: string;
}

export interface SseHeartbeatMetrics {
  activeConnections: number;
  totalPingsSent: number;
  staleConnectionsPruned: number;
}

/**
 * Service managing Server-Sent Events (SSE) keepalive heartbeats,
 * client connection tracking, and stale socket cleanup.
 */
export class SseHeartbeatService {
  private static clients: Map<string, SseClientSession> = new Map();
  private static totalPings: number = 0;
  private static totalPruned: number = 0;
  private static timer: NodeJS.Timeout | null = null;
  private static intervalMs: number = 15000;

  /**
   * Resets all connections and timers (used for unit testing).
   */
  public static reset(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.clients.clear();
    this.totalPings = 0;
    this.totalPruned = 0;
  }

  /**
   * Registers a client connection to the heartbeat monitor.
   */
  public static registerClient(id: string, res: Response, ip?: string): SseClientSession {
    const session: SseClientSession = {
      id,
      res,
      connectedAt: Date.now(),
      lastPingAt: Date.now(),
      pingsSent: 0,
      ip,
    };

    this.clients.set(id, session);
    return session;
  }

  /**
   * Unregisters a client connection.
   */
  public static unregisterClient(id: string): boolean {
    return this.clients.delete(id);
  }

  /**
   * Dispatches a single keepalive pulse across all connected clients.
   */
  public static dispatchHeartbeat(): number {
    const now = Date.now();
    let sentCount = 0;

    for (const [id, session] of this.clients.entries()) {
      try {
        if (session.res.writableEnded || session.res.closed) {
          this.clients.delete(id);
          this.totalPruned++;
          continue;
        }

        session.res.write(`:keepalive ${now}\n\n`);
        session.lastPingAt = now;
        session.pingsSent++;
        this.totalPings++;
        sentCount++;
      } catch {
        this.clients.delete(id);
        this.totalPruned++;
      }
    }

    return sentCount;
  }

  /**
   * Returns telemetry metrics for active connections and ping counts.
   */
  public static getMetrics(): SseHeartbeatMetrics {
    return {
      activeConnections: this.clients.size,
      totalPingsSent: this.totalPings,
      staleConnectionsPruned: this.totalPruned,
    };
  }
}
