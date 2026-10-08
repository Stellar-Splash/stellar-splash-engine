import { Request, Response } from 'express';
import { z } from 'zod';
import { StoreService } from '../services/store.service';
import { EventBusService } from '../services/event-bus.service';
import { Tournament } from '../types';
import { CONFIG } from '../config';

const CreateTournamentSchema = z.object({
  name: z.string().min(3).max(64),
  description: z.string().min(5).max(500),
  gameId: z.string().default('splash-rush'),
  creatorWallet: z.string().min(56).max(56),
  prizeAsset: z.enum(['XLM', 'USDC']),
  prizePoolAmount: z.number().positive(),
  maxParticipants: z.number().int().min(2).max(1024),
  startTime: z.number().int().positive(),
  endTime: z.number().int().positive(),
  vaultAddress: z.string().optional(),
});

export class TournamentController {
  public static listTournaments(_req: Request, res: Response): void {
    const list = StoreService.getAllTournaments();
    res.json({
      success: true,
      count: list.length,
      tournaments: list,
    });
  }

  public static getTournament(req: Request, res: Response): void {
    const { id } = req.params;
    const tournament = StoreService.getTournamentById(id);

    if (!tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' });
      return;
    }

    res.json({ success: true, tournament });
  }

  public static createTournament(req: Request, res: Response): void {
    const parseResult = CreateTournamentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.errors });
      return;
    }

    const data = parseResult.data;
    if (data.endTime <= data.startTime) {
      res.status(400).json({ success: false, error: 'End time must be after start time' });
      return;
    }

    const tournamentId = `tourn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const tournament: Tournament = {
      id: tournamentId,
      name: data.name,
      description: data.description,
      gameId: data.gameId,
      gameVersion: CONFIG.GAME_VERSIONS['splash-rush'] || '1.0.0',
      creatorWallet: data.creatorWallet,
      prizeAsset: data.prizeAsset,
      prizePoolAmount: data.prizePoolAmount,
      vaultAddress: data.vaultAddress || CONFIG.DEFAULT_VAULT_ADDRESS,
      maxParticipants: data.maxParticipants,
      currentParticipants: 0,
      startTime: data.startTime,
      endTime: data.endTime,
      state: 'FUNDING', // Newly created tournaments require prize pool funding
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    StoreService.saveTournament(tournament);

    EventBusService.broadcast('TOURNAMENT_CREATED', {
      tournamentId: tournament.id,
      name: tournament.name,
      prizePoolAmount: tournament.prizePoolAmount,
      prizeAsset: tournament.prizeAsset,
      creatorWallet: tournament.creatorWallet,
    });

    res.status(201).json({ success: true, tournament });
  }

  public static joinTournament(req: Request, res: Response): void {
    const { id } = req.params;
    const { playerWallet } = req.body;

    if (!playerWallet || typeof playerWallet !== 'string' || playerWallet.length !== 56) {
      res.status(400).json({ success: false, error: 'Valid 56-character Stellar wallet address required' });
      return;
    }

    const tournament = StoreService.getTournamentById(id);
    if (!tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' });
      return;
    }

    // Validation checks per specification
    if (tournament.state !== 'OPEN') {
      res.status(400).json({
        success: false,
        error: `Tournament is not open for registration (Current state: ${tournament.state}). Ensure prize pool is funded.`,
      });
      return;
    }

    if (tournament.maxParticipants > 0 && tournament.currentParticipants >= tournament.maxParticipants) {
      res.status(400).json({ success: false, error: 'Tournament has reached maximum participant capacity' });
      return;
    }

    const existing = StoreService.getParticipant(id, playerWallet);
    if (existing) {
      res.status(409).json({ success: false, error: 'Player is already registered in this tournament' });
      return;
    }

    const participant = {
      tournamentId: id,
      playerWallet,
      joinedAt: Date.now(),
      matchesPlayed: 0,
      bestScore: 0,
      status: 'ACTIVE' as const,
    };

    StoreService.addParticipant(participant);

    EventBusService.broadcast('PLAYER_JOINED', {
      tournamentId: id,
      playerWallet,
      currentParticipants: tournament.currentParticipants,
    });

    res.status(200).json({ success: true, participant });
  }

  public static getLeaderboard(req: Request, res: Response): void {
    const { id } = req.params;
    const tournament = StoreService.getTournamentById(id);

    if (!tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' });
      return;
    }

    const participants = StoreService.getParticipants(id);
    const results = StoreService.getAllResultsForTournament(id);

    // Sort participants by best score descending
    const sorted = [...participants].sort((a, b) => b.bestScore - a.bestScore);

    const leaderboard = sorted.map((p, index) => {
      // Find latest verified match result for this player
      const playerResult = results.find((r) => r.playerWallet === p.playerWallet);

      return {
        rank: index + 1,
        playerWallet: p.playerWallet,
        shortWallet: `${p.playerWallet.slice(0, 4)}...${p.playerWallet.slice(-4)}`,
        currentScore: p.bestScore,
        matchesPlayed: p.matchesPlayed,
        status: p.status,
        // Crucial distinction required by specification:
        scoreLabel: 'Current Score',
        finalVerifiedResult: playerResult
          ? {
              score: playerResult.finalScore,
              resultHash: playerResult.resultHash,
              verified: playerResult.verified,
            }
          : null,
      };
    });

    res.json({
      success: true,
      tournamentId: id,
      tournamentName: tournament.name,
      totalParticipants: participants.length,
      leaderboard,
    });
  }
}
