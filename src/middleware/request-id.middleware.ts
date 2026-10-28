import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Tracing middleware that assigns a unique UUIDv4 to every incoming HTTP request,
 * preserving client-provided correlation IDs or generating a fresh cryptographically random UUID.
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const incomingId = req.headers[REQUEST_ID_HEADER];
  const requestId =
    typeof incomingId === 'string' && incomingId.trim().length > 0
      ? incomingId.trim()
      : randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};
