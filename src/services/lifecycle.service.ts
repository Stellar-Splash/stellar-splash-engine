import { Tournament, TournamentState } from '../types';
import { AppError } from '../middleware/error.middleware';

/**
 * Valid state transition adjacency map for tournament lifecycles.
 */
export const ALLOWED_TRANSITIONS: Record<TournamentState, readonly TournamentState[]> = {
  DRAFT: ['FUNDING', 'CANCELLED'],
  FUNDING: ['OPEN', 'CANCELLED'],
  OPEN: ['FULL', 'IN_PROGRESS', 'CANCELLED'],
  FULL: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['RESULTS_PENDING', 'CANCELLED'],
  RESULTS_PENDING: ['VERIFYING', 'CANCELLED'],
  VERIFYING: ['VERIFIED', 'CANCELLED'],
  VERIFIED: ['FINALIZED', 'CANCELLED'],
  FINALIZED: ['SETTLING', 'CANCELLED'],
  SETTLING: ['SETTLED', 'CANCELLED'],
  SETTLED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export interface StateTransitionEvent {
  tournamentId: string;
  fromState: TournamentState;
  toState: TournamentState;
  timestamp: number;
  reason?: string;
  triggeredBy?: string;
}

export class LifecycleService {
  /**
   * Checks whether a state transition is topologically allowed.
   */
  public static canTransition(from: TournamentState, to: TournamentState): boolean {
    const allowed = ALLOWED_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Asserts that a state transition is valid and all domain invariants are satisfied.
   * Throws AppError(400) if transition or preconditions fail.
   */
  public static validateTransition(
    tournament: Tournament,
    toState: TournamentState,
    reason?: string
  ): StateTransitionEvent {
    const fromState = tournament.state;

    // Check terminal states
    if (fromState === 'COMPLETED' || fromState === 'CANCELLED') {
      throw new AppError(
        `Cannot transition tournament ${tournament.id} from terminal state '${fromState}' to '${toState}'.`,
        400,
        'ILLEGAL_LIFECYCLE_TRANSITION'
      );
    }

    if (!this.canTransition(fromState, toState)) {
      throw new AppError(
        `Illegal state transition from '${fromState}' to '${toState}'. Allowed transitions: [${ALLOWED_TRANSITIONS[fromState].join(', ')}].`,
        400,
        'INVALID_STATE_TRANSITION'
      );
    }

    // Specific domain invariant validation
    if (toState === 'OPEN') {
      if (!tournament.fundingTxHash && tournament.prizePoolAmount <= 0) {
        throw new AppError(
          `Cannot transition tournament to OPEN without verified on-chain prize funding.`,
          400,
          'UNFUNDED_TOURNAMENT_ERROR'
        );
      }
    }

    if (toState === 'IN_PROGRESS') {
      if (tournament.currentParticipants < 1) {
        throw new AppError(
          `Cannot start tournament without at least one registered participant.`,
          400,
          'INSUFFICIENT_PARTICIPANTS'
        );
      }
    }

    if (toState === 'SETTLING') {
      if (!tournament.finalRankingHash) {
        throw new AppError(
          `Cannot settle tournament without a verified final ranking hash.`,
          400,
          'MISSING_RANKING_HASH'
        );
      }
    }

    return {
      tournamentId: tournament.id,
      fromState,
      toState,
      timestamp: Date.now(),
      reason,
    };
  }

  /**
   * Applies validated state transition to tournament object.
   */
  public static applyTransition(
    tournament: Tournament,
    toState: TournamentState,
    reason?: string
  ): StateTransitionEvent {
    const event = this.validateTransition(tournament, toState, reason);
    tournament.state = toState;
    tournament.updatedAt = event.timestamp;
    return event;
  }
}
