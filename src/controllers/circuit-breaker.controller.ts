import { Request, Response } from 'express';
import { circuitBreaker } from '../services/circuit-breaker.service';

export class CircuitBreakerController {
  public static getStatus(_req: Request, res: Response): void {
    const status = circuitBreaker.getStatus();
    res.json({
      success: true,
      data: status,
    });
  }
}
