import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBusService } from '../services/event-bus.service';
import { Response } from 'express';

describe('EventBusService with SSE Heartbeat', () => {
  beforeEach(() => {
    EventBusService.stopHeartbeat();
  });

  afterEach(() => {
    EventBusService.stopHeartbeat();
  });

  it('manages subscribers and tracks active count', () => {
    const mockRes = {
      write: vi.fn(),
    } as unknown as Response;

    EventBusService.addSubscriber(mockRes);
    expect(EventBusService.getSubscriberCount()).toBe(1);

    EventBusService.broadcast('TOURNAMENT_CREATED', { tournamentId: 't1' });
    expect(mockRes.write).toHaveBeenCalledWith(
      expect.stringContaining('event: TOURNAMENT_CREATED'),
    );

    EventBusService.removeSubscriber(mockRes);
    expect(EventBusService.getSubscriberCount()).toBe(0);
  });

  it('automatically prunes disconnected client when write fails', () => {
    const brokenRes = {
      write: vi.fn().mockImplementation(() => {
        throw new Error('Broken pipe');
      }),
    } as unknown as Response;

    EventBusService.addSubscriber(brokenRes);
    expect(EventBusService.getSubscriberCount()).toBe(1);

    EventBusService.broadcast('MATCH_STARTED', { matchId: 'm1' });
    expect(EventBusService.getSubscriberCount()).toBe(0);
  });

  it('reports telemetry accurately and filters broadcast recipients', () => {
    const client1 = {
      write: vi.fn(),
      locals: { channel: 'alpha' },
    } as unknown as Response;

    const client2 = {
      write: vi.fn(),
      locals: { channel: 'beta' },
    } as unknown as Response;

    EventBusService.addSubscriber(client1);
    EventBusService.addSubscriber(client2);

    const telemetryBefore = EventBusService.getTelemetry();
    expect(telemetryBefore.activeSubscribers).toBe(2);

    EventBusService.broadcastToFiltered(
      'LEADERBOARD_UPDATED',
      { scores: [100, 90] },
      (res: any) => res.locals?.channel === 'alpha',
    );

    expect(client1.write).toHaveBeenCalledTimes(1);
    expect(client2.write).not.toHaveBeenCalled();

    EventBusService.removeSubscriber(client1);
    EventBusService.removeSubscriber(client2);
  });

  it('prunes clients marked as writableEnded or destroyed', () => {
    const endedClient = {
      write: vi.fn(),
      writableEnded: true,
    } as unknown as Response;

    EventBusService.addSubscriber(endedClient);
    expect(EventBusService.getSubscriberCount()).toBe(1);

    const pruned = EventBusService.pruneStaleConnections();
    expect(pruned).toBe(1);
    expect(EventBusService.getSubscriberCount()).toBe(0);
  });
});
