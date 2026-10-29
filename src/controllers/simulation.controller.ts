import { Request, Response } from 'express';
import { sorobanPreflightService } from '../services/preflight.service';

export class SimulationController {
  public static async simulate(req: Request, res: Response): Promise<void> {
    const { transactionXdr } = req.body;
    if (!transactionXdr || typeof transactionXdr !== 'string') {
      res.status(400).json({
        success: false,
        error: 'transactionXdr string is required in request body',
      });
      return;
    }

    try {
      const result = await sorobanPreflightService.simulate({ transactionXdr });
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error?.message || 'Preflight simulation failed unexpectedly',
      });
    }
  }
}
