import { describe, it, expect, vi, beforeEach } from 'vitest';
import { latencyTimerMiddleware } from '../middleware/latency-timer.middleware';
import { MetricsService } from '../services/metrics.service';
import { Request, Response } from 'express';
import EventEmitter from 'events';

describe('latencyTimerMiddleware', () => {
  beforeEach(() => {
    MetricsService.reset();
  });

  it('sets X-Response-Time header and records Prometheus HTTP metrics on finish', async () => {
    const emitter = new EventEmitter();
    const headers: Record<string, string> = {};

    const req = {
      method: 'GET',
      path: '/api/tournaments',
      url: '/api/tournaments',
    } as unknown as Request;

    const res = Object.assign(emitter, {
      headersSent: false,
      statusCode: 200,
      setHeader: vi.fn((key: string, val: string) => {
        headers[key.toLowerCase()] = val;
      }),
      writeHead: vi.fn(),
    }) as unknown as Response;

    const next = vi.fn();

    latencyTimerMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Trigger writeHead
    (res as any).writeHead(200);
    expect(res.setHeader).toHaveBeenCalledWith('X-Response-Time', expect.stringMatching(/^\d+(\.\d+)?ms$/));

    // Emit response finish
    emitter.emit('finish');

    const metrics = MetricsService.getMetrics();
    expect(metrics.httpRequests['GET_/api/tournaments_200']).toBe(1);
  });
});
