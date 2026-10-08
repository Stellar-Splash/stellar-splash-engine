import { Response } from 'express';

export type PlatformEventType =
  | 'TOURNAMENT_CREATED'
  | 'PRIZE_POOL_FUNDED'
  | 'TOURNAMENT_OPENED'
  | 'PLAYER_JOINED'
  | 'MATCH_STARTED'
  | 'MATCH_COMPLETED'
  | 'MATCH_VERIFIED'
  | 'LEADERBOARD_UPDATED'
  | 'RECONCILIATION_UPDATED'
  | 'AGREEMENT_CREATED'
  | 'AGREEMENT_APPROVED'
  | 'AGREEMENT_LOCKED'
  | 'RANKING_FINALIZED';

export interface PlatformEventPayload {
  type: PlatformEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export class EventBusService {
  private static subscribers: Set<Response> = new Set();

  public static addSubscriber(res: Response): void {
    this.subscribers.add(res);
  }

  public static removeSubscriber(res: Response): void {
    this.subscribers.delete(res);
  }

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
