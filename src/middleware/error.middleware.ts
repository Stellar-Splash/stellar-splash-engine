import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details?: any;

  constructor(message: string, statusCode = 400, errorCode = 'BAD_REQUEST', details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Catches unhandled routes and returns standard JSON 404 response.
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Endpoint ${req.method} ${req.originalUrl} not found on Splash Engine`,
    timestamp: Date.now(),
  });
};

/**
 * Standardized global JSON error handling middleware.
 */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle JSON parse syntax errors from express.json()
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    res.status(400).json({
      success: false,
      error: 'INVALID_JSON_BODY',
      message: 'Malformed JSON payload in request body',
      timestamp: Date.now(),
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Request payload failed schema validation',
      details: err.flatten(),
      timestamp: Date.now(),
    });
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.errorCode,
      message: err.message,
      details: err.details,
      timestamp: Date.now(),
    });
    return;
  }

  // Fallback 500 Internal Server Error
  const message = err?.message || 'An unexpected internal error occurred';
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message,
    timestamp: Date.now(),
  });
};
