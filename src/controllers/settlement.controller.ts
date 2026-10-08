import { Request, Response } from 'express';
import { SettlementService } from '../services/settlement.service';
import { StoreService } from '../services/store.service';

export class SettlementController {
  /**
   * Evaluates eligibility for settlement.
   * GET /api/settlements/:tournamentId/eligibility
   */
  public static async getEligibility(req: Request, res: Response): Promise<void> {
    try {
      const { tournamentId } = req.params;
      const eligibility = SettlementService.checkEligibility(tournamentId);

      res.json({
        success: true,
        eligibility,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        success: false,
        error: 'ELIGIBILITY_CHECK_FAILED',
        message: errorMsg,
      });
    }
  }

  /**
   * Previews settlement snapshot, recipients, basis-point allocation, and accounting invariants.
   * GET /api/settlements/:tournamentId/preview
   */
  public static async getPreview(req: Request, res: Response): Promise<void> {
    try {
      const { tournamentId } = req.params;

      const existing = StoreService.getSettlementByTournament(tournamentId);
      if (existing) {
        res.json({
          success: true,
          settlement: existing,
          snapshot: existing.snapshot,
          isExisting: true,
        });
        return;
      }

      const { snapshot, settlementRecord } = SettlementService.createSnapshot(tournamentId);
      res.json({
        success: true,
        settlement: settlementRecord,
        snapshot,
        isExisting: false,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(400).json({
        success: false,
        error: 'SETTLEMENT_PREVIEW_FAILED',
        message: errorMsg,
      });
    }
  }

  /**
   * Authorizes a settlement with cryptographic binding of ranking and agreement hashes.
   * POST /api/settlements/:tournamentId/authorize
   */
  public static async authorizeSettlement(req: Request, res: Response): Promise<void> {
    try {
      const { tournamentId } = req.params;
      const { authorizedBy } = req.body;

      if (!authorizedBy) {
        res.status(400).json({
          success: false,
          error: 'MISSING_AUTHORIZER',
          message: 'authorizedBy wallet address is required.',
        });
        return;
      }

      const settlement = SettlementService.authorizeSettlement({
        tournamentId,
        authorizedBy,
      });

      res.json({
        success: true,
        settlement,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(400).json({
        success: false,
        error: 'AUTHORIZATION_FAILED',
        message: errorMsg,
      });
    }
  }

  /**
   * Executes multi-recipient payout transactions on Stellar Testnet.
   * POST /api/settlements/:tournamentId/execute
   */
  public static async executeSettlement(req: Request, res: Response): Promise<void> {
    try {
      const { tournamentId } = req.params;
      const { vaultSecretKey } = req.body;

      const result = await SettlementService.executeSettlement({
        tournamentId,
        vaultSecretKey,
      });

      res.json({
        success: true,
        settlement: result.settlement,
        transactions: result.transactions,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(400).json({
        success: false,
        error: 'EXECUTION_FAILED',
        message: errorMsg,
      });
    }
  }

  /**
   * Retrieves active settlement for a tournament.
   * GET /api/settlements/:tournamentId
   */
  public static async getSettlement(req: Request, res: Response): Promise<void> {
    try {
      const { tournamentId } = req.params;
      const settlement = StoreService.getSettlementByTournament(tournamentId);

      if (!settlement) {
        res.status(404).json({
          success: false,
          error: 'SETTLEMENT_NOT_FOUND',
          message: `No settlement found for tournament ${tournamentId}.`,
        });
        return;
      }

      const transactions = StoreService.getSettlementTransactions(settlement.settlementId);
      const reconciliation = StoreService.getSettlementReconciliation(settlement.settlementId);

      res.json({
        success: true,
        settlement,
        transactions,
        reconciliation,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        success: false,
        error: 'FETCH_SETTLEMENT_FAILED',
        message: errorMsg,
      });
    }
  }

  /**
   * Runs or fetches independent reconciliation for a settlement.
   * POST /api/settlements/:settlementId/reconcile
   */
  public static async reconcile(req: Request, res: Response): Promise<void> {
    try {
      const { settlementId } = req.params;
      const reconciliation = SettlementService.reconcileSettlement(settlementId);

      res.json({
        success: true,
        reconciliation,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(400).json({
        success: false,
        error: 'RECONCILIATION_FAILED',
        message: errorMsg,
      });
    }
  }

  /**
   * Retrieves historical payouts for a specific player wallet.
   * GET /api/settlements/player/:playerWallet
   */
  public static async getPlayerPayouts(req: Request, res: Response): Promise<void> {
    try {
      const { playerWallet } = req.params;
      const payouts = StoreService.getPlayerPayouts(playerWallet);

      res.json({
        success: true,
        playerWallet,
        count: payouts.length,
        payouts,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        success: false,
        error: 'PLAYER_PAYOUTS_FAILED',
        message: errorMsg,
      });
    }
  }
}
