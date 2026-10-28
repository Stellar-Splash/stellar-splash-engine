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
    expect(mockRes.write).toHaveBeenCalledWith(expect.stringContaining('event: TOURNAMENT_CREATED'));

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
});
