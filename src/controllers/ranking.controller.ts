import { Request, Response } from 'express';
import { z } from 'zod';
import { StoreService } from '../services/store.service';
import { RankingService } from '../services/ranking.service';
import { EventBusService } from '../services/event-bus.service';

const FinalizeRankingSchema = z.object({
  finalizedBy: z.string().min(56).max(56),
});

export class RankingController {
  /**
   * Retrieves final or preview ranking for a tournament.
   * Only verified results are permitted to participate in rankings.
   */
  public static getTournamentRanking(req: Request, res: Response): void {
    const { tournamentId } = req.params;

    const tournament = StoreService.getTournamentById(tournamentId);
    if (!tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' });
      return;
    }

    const finalized = StoreService.getRanking(tournamentId);
    if (finalized) {
      res.json({
        success: true,
        finalized: true,
        ranking: finalized,
      });
      return;
    }

    // Generate real-time preview of verified results
    const results = StoreService.getAllResultsForTournament(tournamentId);
    const verifications = results
      .map((r) => StoreService.getVerification(r.matchId))
      .filter((v): v is NonNullable<typeof v> => v !== undefined && v.status === 'VERIFIED');

    const previewEntries = RankingService.calculateRankings(verifications, results);
    const tentativeHash = RankingService.generateRankingHash(tournamentId, 0, previewEntries);

    res.json({
      success: true,
      finalized: false,
      ranking: {
        tournamentId,
        rankingVersion: 0,
        entries: previewEntries,
        rankingHash: tentativeHash,
        finalizedAt: 0,
        finalizedBy: '',
      },
    });
  }

  /**
   * Finalizes the tournament ranking deterministically.
   * Prevents unverified results from contributing to the finalized ranking.
   */
  public static finalizeRanking(req: Request, res: Response): void {
    const { tournamentId } = req.params;
    const parseResult = FinalizeRankingSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.errors });
      return;
    }

    const tournament = StoreService.getTournamentById(tournamentId);
    if (!tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' });
      return;
    }

    // Check if already finalized (immutability)
    const existing = StoreService.getRanking(tournamentId);
    if (existing) {
      res.status(409).json({
        success: false,
        error: 'RANKING_ALREADY_FINALIZED: Finalized tournament rankings are immutable.',
        ranking: existing,
      });
      return;
    }

    const results = StoreService.getAllResultsForTournament(tournamentId);
    const verifications = results
      .map((r) => StoreService.getVerification(r.matchId))
      .filter((v): v is NonNullable<typeof v> => v !== undefined && v.status === 'VERIFIED');

    const rankingVersion = (tournament.activeAgreementVersion || 1);
    const finalRecord = RankingService.finalizeTournamentRanking(
      tournamentId,
      verifications,
      results,
      parseResult.data.finalizedBy,
      rankingVersion
    );

    StoreService.saveRanking(finalRecord);

    EventBusService.broadcast('RANKING_FINALIZED', {
      tournamentId,
      rankingHash: finalRecord.rankingHash,
      entriesCount: finalRecord.entries.length,
      finalizedBy: finalRecord.finalizedBy,
    });

    res.status(201).json({
      success: true,
      ranking: finalRecord,
    });
  }
}
