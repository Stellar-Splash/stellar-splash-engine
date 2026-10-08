import { Request, Response } from 'express';
import { z } from 'zod';
import { StoreService } from '../services/store.service';
import { BlockchainService } from '../services/blockchain.service';
import { EventBusService } from '../services/event-bus.service';
import { PrizePoolFunding } from '../types';

const FundPrizePoolSchema = z.object({
  txHash: z.string().length(64),
  funderWallet: z.string().min(56).max(56),
});

export class PrizePoolController {
  public static getPrizePool(req: Request, res: Response): void {
    const { id } = req.params;
    const tournament = StoreService.getTournamentById(id);

    if (!tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' });
      return;
    }

    const funding = StoreService.getFundingForTournament(id);
    const reconciliation = StoreService.getReconciliation(id);

    res.json({
      success: true,
      tournamentId: id,
      prizeAsset: tournament.prizeAsset,
      prizePoolAmount: tournament.prizePoolAmount,
      vaultAddress: tournament.vaultAddress,
      isFunded: tournament.state !== 'FUNDING' && tournament.state !== 'DRAFT',
      fundingStatus: tournament.state === 'FUNDING' ? 'UNFUNDED' : 'FUNDED',
      fundingRecord: funding || null,
      explorerUrl: funding ? funding.explorerUrl : null,
      reconciliation,
    });
  }

  public static async fundPrizePool(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const parseResult = FundPrizePoolSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.errors });
      return;
    }

    const { txHash, funderWallet } = parseResult.data;

    const tournament = StoreService.getTournamentById(id);
    if (!tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' });
      return;
    }

    // Idempotency Check: Verify if transaction was already consumed
    if (StoreService.isTxConsumed(txHash)) {
      const existing = StoreService.getFundingByTx(txHash);
      if (existing && existing.tournamentId === id) {
        res.status(200).json({
          success: true,
          message: 'Transaction already verified and consumed for this tournament (idempotent response).',
          funding: existing,
          tournament,
        });
        return;
      }

      res.status(409).json({
        success: false,
        error: 'DUPLICATE_TRANSACTION: This Stellar transaction has already been consumed by another tournament.',
      });
      return;
    }

    // Perform independent on-chain verification
    const verification = await BlockchainService.verifyFundingTransaction({
      txHash,
      expectedFunder: funderWallet,
      expectedVault: tournament.vaultAddress,
      expectedAsset: tournament.prizeAsset,
      expectedAmount: tournament.prizePoolAmount,
    });

    if (!verification.valid) {
      res.status(422).json({
        success: false,
        error: 'INDEPENDENT_VERIFICATION_FAILED',
        details: verification.error,
        txHash,
      });
      return;
    }

    // Record verified prize pool funding
    const fundingRecord: PrizePoolFunding = {
      tournamentId: id,
      txHash,
      funderWallet,
      destinationVault: tournament.vaultAddress,
      asset: tournament.prizeAsset,
      amount: tournament.prizePoolAmount,
      ledger: verification.ledger || 0,
      verifiedAt: Date.now(),
      explorerUrl: BlockchainService.getExplorerUrl(txHash),
      status: 'CONFIRMED',
    };

    StoreService.recordFunding(fundingRecord);

    // Transition tournament state from FUNDING to OPEN
    tournament.state = 'OPEN';
    tournament.fundingTxHash = txHash;
    tournament.fundingVerifiedAt = fundingRecord.verifiedAt;
    StoreService.saveTournament(tournament);

    // Broadcast real-time events
    EventBusService.broadcast('PRIZE_POOL_FUNDED', {
      tournamentId: id,
      txHash,
      funderWallet,
      amount: tournament.prizePoolAmount,
      asset: tournament.prizeAsset,
      explorerUrl: fundingRecord.explorerUrl,
    });

    EventBusService.broadcast('TOURNAMENT_OPENED', {
      tournamentId: id,
      name: tournament.name,
      prizePoolAmount: tournament.prizePoolAmount,
      prizeAsset: tournament.prizeAsset,
    });

    res.status(200).json({
      success: true,
      message: 'Prize pool successfully verified on Stellar Testnet and tournament opened.',
      funding: fundingRecord,
      tournament,
    });
  }
}
