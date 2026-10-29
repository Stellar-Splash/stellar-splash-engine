import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Response } from 'express';
import { SseHeartbeatService } from '../src/services/sse-heartbeat.service';

describe('SseHeartbeatService', () => {
  beforeEach(() => {
    SseHeartbeatService.reset();
  });

  it('registers and unregisters SSE client connections', () => {
    const mockRes = {
      writableEnded: false,
      closed: false,
      write: vi.fn(),
    } as unknown as Response;

    const session = SseHeartbeatService.registerClient('conn-1', mockRes, '127.0.0.1');
    expect(session.id).toBe('conn-1');
    expect(session.pingsSent).toBe(0);

    let metrics = SseHeartbeatService.getMetrics();
    expect(metrics.activeConnections).toBe(1);

    const unregistered = SseHeartbeatService.unregisterClient('conn-1');
    expect(unregistered).toBe(true);

    metrics = SseHeartbeatService.getMetrics();
    expect(metrics.activeConnections).toBe(0);
  });

  it('dispatches keepalive comments to active clients', () => {
    const writeMock = vi.fn();
    const mockRes = {
      writableEnded: false,
      closed: false,
      write: writeMock,
    } as unknown as Response;

    SseHeartbeatService.registerClient('conn-1', mockRes);
    SseHeartbeatService.registerClient('conn-2', mockRes);

    const sent = SseHeartbeatService.dispatchHeartbeat();
    expect(sent).toBe(2);
    expect(writeMock).toHaveBeenCalledTimes(2);

    const metrics = SseHeartbeatService.getMetrics();
    expect(metrics.totalPingsSent).toBe(2);
  });

  it('prunes stale or closed client sockets during dispatch', () => {
    const activeWrite = vi.fn();
    const activeRes = {
      writableEnded: false,
      closed: false,
      write: activeWrite,
    } as unknown as Response;

    const closedRes = {
      writableEnded: true,
      closed: true,
      write: vi.fn(),
    } as unknown as Response;

    SseHeartbeatService.registerClient('active-conn', activeRes);
    SseHeartbeatService.registerClient('closed-conn', closedRes);

    const sent = SseHeartbeatService.dispatchHeartbeat();
    expect(sent).toBe(1);

    const metrics = SseHeartbeatService.getMetrics();
    expect(metrics.activeConnections).toBe(1);
    expect(metrics.staleConnectionsPruned).toBe(1);
  });
});
