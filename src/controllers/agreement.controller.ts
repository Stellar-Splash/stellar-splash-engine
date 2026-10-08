import { Request, Response } from 'express';
import { z } from 'zod';
import { StoreService } from '../services/store.service';
import { AgreementService } from '../services/agreement.service';
import { EventBusService } from '../services/event-bus.service';

const CreateAgreementSchema = z.object({
  tournamentId: z.string(),
  version: z.number().int().positive(),
  prizeAsset: z.string().min(1),
  prizePoolAmount: z.number().positive(),
  allocationRules: z.array(
    z.object({
      rank: z.number().int().positive(),
      basisPoints: z.number().int().min(1).max(10000),
      label: z.string(),
    })
  ).min(1),
  createdBy: z.string().min(56).max(56),
});

const ApproveAgreementSchema = z.object({
  approverWallet: z.string().min(56).max(56),
  signature: z.string().optional(),
});

const LockAgreementSchema = z.object({
  actorWallet: z.string().min(56).max(56),
});

export class AgreementController {
  /**
   * Retrieves all prize agreement versions for a tournament.
   */
  public static getTournamentAgreements(req: Request, res: Response): void {
    const { tournamentId } = req.params;
    const agreements = StoreService.getAgreementsForTournament(tournamentId);

    res.json({
      success: true,
      agreements,
    });
  }

  /**
   * Retrieves the active (LOCKED or latest) prize agreement for a tournament.
   */
  public static getActiveAgreement(req: Request, res: Response): void {
    const { tournamentId } = req.params;
    const agreement = StoreService.getActiveAgreement(tournamentId);

    if (!agreement) {
      res.status(404).json({ success: false, error: 'No prize agreement found for tournament' });
      return;
    }

    res.json({
      success: true,
      agreement,
    });
  }

  /**
   * Creates a new prize agreement version with 10,000 basis points invariant validation.
   */
  public static createAgreement(req: Request, res: Response): void {
    const parseResult = CreateAgreementSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.errors });
      return;
    }

    const { tournamentId, version, prizeAsset, prizePoolAmount, allocationRules, createdBy } =
      parseResult.data;

    const tournament = StoreService.getTournamentById(tournamentId);
    if (!tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' });
      return;
    }

    // Check if that version already exists
    const existing = StoreService.getAgreement(tournamentId, version);
    if (existing) {
      res.status(409).json({
        success: false,
        error: `Agreement version ${version} already exists. Increment version for updates.`,
      });
      return;
    }

    try {
      const agreement = AgreementService.createAgreement({
        tournamentId,
        version,
        prizeAsset,
        prizePoolAmount,
        allocationRules,
        createdBy,
      });

      StoreService.saveAgreement(agreement);

      EventBusService.broadcast('AGREEMENT_CREATED', {
        tournamentId,
        version: agreement.version,
        agreementHash: agreement.agreementHash,
        status: agreement.status,
      });

      res.status(201).json({
        success: true,
        agreement,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || 'Invalid prize agreement parameters',
      });
    }
  }

  /**
   * Creator approves a specific agreement version and hash.
   */
  public static approveAgreement(req: Request, res: Response): void {
    const { tournamentId, version } = req.params;
    const versionNum = parseInt(version, 10);

    const parseResult = ApproveAgreementSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.errors });
      return;
    }

    const agreement = StoreService.getAgreement(tournamentId, versionNum);
    if (!agreement) {
      res.status(404).json({ success: false, error: 'Agreement version not found' });
      return;
    }

    if (agreement.status === 'LOCKED') {
      res.status(400).json({ success: false, error: 'Agreement is already locked and immutable' });
      return;
    }

    agreement.approvedBy = parseResult.data.approverWallet;
    agreement.approvedAt = Date.now();
    agreement.approvalSignature = parseResult.data.signature || 'APPROVED_BY_WALLET';
    agreement.status = 'READY_TO_LOCK';

    StoreService.saveAgreement(agreement);

    EventBusService.broadcast('AGREEMENT_APPROVED', {
      tournamentId,
      version: agreement.version,
      approvedBy: agreement.approvedBy,
      agreementHash: agreement.agreementHash,
    });

    res.json({
      success: true,
      agreement,
    });
  }

  /**
   * Locks the prize agreement permanently.
   * Locked agreements cannot be edited or mutated.
   */
  public static lockAgreement(req: Request, res: Response): void {
    const { tournamentId, version } = req.params;
    const versionNum = parseInt(version, 10);

    const parseResult = LockAgreementSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.errors });
      return;
    }

    const agreement = StoreService.getAgreement(tournamentId, versionNum);
    if (!agreement) {
      res.status(404).json({ success: false, error: 'Agreement version not found' });
      return;
    }

    if (agreement.status === 'LOCKED') {
      res.json({
        success: true,
        message: 'Agreement is already locked (idempotent).',
        agreement,
      });
      return;
    }

    if (!agreement.approvedBy) {
      res.status(400).json({
        success: false,
        error: 'CANNOT_LOCK: Agreement must be approved by creator before locking.',
      });
      return;
    }

    // Mark previous locked versions as SUPERSEDED
    const allAgreements = StoreService.getAgreementsForTournament(tournamentId);
    for (const other of allAgreements) {
      if (other.version !== versionNum && other.status === 'LOCKED') {
        other.status = 'SUPERSEDED';
        StoreService.saveAgreement(other);
      }
    }

    agreement.status = 'LOCKED';
    agreement.lockedAt = Date.now();

    StoreService.saveAgreement(agreement);

    EventBusService.broadcast('AGREEMENT_LOCKED', {
      tournamentId,
      version: agreement.version,
      agreementHash: agreement.agreementHash,
      lockedAt: agreement.lockedAt,
    });

    res.json({
      success: true,
      agreement,
    });
  }
}
