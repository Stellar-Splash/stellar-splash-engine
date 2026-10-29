import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../services/metrics.service';

export const RESPONSE_TIME_HEADER = 'x-response-time';

/**
 * High-precision latency tracking middleware using process.hrtime.bigint().
 * Calculates elapsed execution time and emits X-Response-Time header while
 * feeding route metrics into Prometheus telemetry.
 */
export const latencyTimerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const startNano = process.hrtime.bigint();

  // Intercept writeHead to ensure header is injected before headers are sent to socket
  const originalWriteHead = res.writeHead.bind(res);

  (res as any).writeHead = function (...args: any[]) {
    const endNano = process.hrtime.bigint();
    const elapsedMs = Number(endNano - startNano) / 1_000_000;
    const formatted = `${elapsedMs.toFixed(2)}ms`;

    if (!res.headersSent) {
      res.setHeader('X-Response-Time', formatted);
    }

    return (originalWriteHead as any).apply(res, args);
  };

  res.on('finish', () => {
    const endNano = process.hrtime.bigint();
    const elapsedMs = Number(endNano - startNano) / 1_000_000;
    MetricsService.recordHttpRequest(req.method, req.path || req.url, res.statusCode);
  });

  next();
};
