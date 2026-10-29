import { StoreService } from './store.service';
import { Tournament } from '../types';

export interface CloneTournamentOptions {
  sourceTournamentId: string;
  newTournamentId: string;
  title: string;
  startTime: number;
  endTime: number;
  creatorWallet: string;
  prizePoolAmount?: number;
}

/**
 * Service enabling creators to clone existing tournament parameters,
 * rules, and payout split templates into new sequential events.
 */
export class TournamentCloningService {
  /**
   * Clones a tournament template and registers the new tournament in StoreService.
   */
  public static cloneTournament(options: CloneTournamentOptions): Tournament {
    const source = StoreService.getTournamentById(options.sourceTournamentId);
    if (!source) {
      throw new Error(`Source tournament ${options.sourceTournamentId} not found`);
    }

    if (source.creatorWallet !== options.creatorWallet) {
      throw new Error('Unauthorized: only the original tournament creator can clone this event');
    }

    if (options.endTime <= options.startTime + 60_000) {
      throw new Error('Invalid timebounds: tournament duration must be at least 60 seconds');
    }

    const prizePool = options.prizePoolAmount ?? source.prizePoolAmount;

    const cloned: Tournament = {
      id: options.newTournamentId,
      name: options.title,
      description: source.description || `Cloned edition of ${source.name}`,
      gameId: source.gameId,
      gameVersion: source.gameVersion,
      creatorWallet: options.creatorWallet,
      prizePoolAmount: prizePool,
      prizeAsset: source.prizeAsset,
      vaultAddress: source.vaultAddress,
      maxParticipants: source.maxParticipants,
      currentParticipants: 0,
      startTime: options.startTime,
      endTime: options.endTime,
      state: 'CREATED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    StoreService.saveTournament(cloned);

    // Audit log cloning event
    StoreService.logAudit('TOURNAMENT_CLONED', options.creatorWallet, {
      sourceTournamentId: options.sourceTournamentId,
      newTournamentId: options.newTournamentId,
      title: options.title,
    });

    return cloned;
  }
}
