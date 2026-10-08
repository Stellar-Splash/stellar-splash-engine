import { Request, Response } from 'express';
import { StoreService } from '../services/store.service';
import { ReplayService } from '../services/replay.service';
import { AttestationService } from '../services/attestation.service';
import { EventBusService } from '../services/event-bus.service';

export class VerificationController {
  /**
   * Triggers independent deterministic replay verification for a completed match.
   */
  public static verifyMatch(req: Request, res: Response): void {
    const { id } = req.params;

    const session = StoreService.getMatchSession(id);
    const result = StoreService.getGameResult(id);

    if (!session || !result) {
      res.status(404).json({ success: false, error: 'Match session or result not found' });
      return;
    }

    // Idempotency: Return existing verification if already performed
    const existing = StoreService.getVerification(id);
    if (existing && existing.status === 'VERIFIED') {
      res.status(200).json({
        success: true,
        message: 'Match already verified (idempotent response).',
        verification: existing,
      });
      return;
    }

    const events = session.events || [];
    const verification = ReplayService.verifyMatch(session, result, events);

    if (verification.status === 'VERIFIED') {
      const attestation = AttestationService.createAttestation(verification);
      verification.attestation = attestation;

      result.verified = true;
      result.resultHash = verification.resultHash;
      StoreService.saveGameResult(result);

      session.status = 'VERIFIED';
      StoreService.updateMatchSession(session);

      StoreService.saveVerification(verification);

      EventBusService.broadcast('MATCH_COMPLETED', {
        matchId: result.matchId,
        tournamentId: result.tournamentId,
        playerWallet: result.playerWallet,
        finalScore: verification.replayedScore,
        resultHash: verification.resultHash,
        status: 'VERIFIED',
      });

      res.status(200).json({
        success: true,
        verification,
      });
    } else {
      session.status = 'VERIFICATION_FAILED';
      StoreService.updateMatchSession(session);
      StoreService.saveVerification(verification);

      res.status(422).json({
        success: false,
        error: 'INDEPENDENT_VERIFICATION_FAILED',
        details: verification.rejectionReason,
        verification,
      });
    }
  }

  /**
   * Retrieves verification record and attestation for a match.
   */
  public static getVerification(req: Request, res: Response): void {
    const { id } = req.params;
    const verification = StoreService.getVerification(id);

    if (!verification) {
      res.status(404).json({ success: false, error: 'Verification record not found' });
      return;
    }

    res.json({ success: true, verification });
  }
}
