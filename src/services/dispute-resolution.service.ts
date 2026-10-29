import { EventBusService } from './event-bus.service';
import { StoreService } from './store.service';

export type DisputeLifecycleStatus = 'ACTIVE' | 'RESOLVED' | 'DISMISSED';

export interface DisputeEntry {
  tournamentId: string;
  challengerWallet: string;
  reasonCode: number;
  description: string;
  evidenceHash?: string;
  status: DisputeLifecycleStatus;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: number;
  submittedAt: number;
}

/**
 * Service orchestrating dispute filing, settlement holds, and administrative resolutions.
 */
export class DisputeResolutionService {
  private static disputes: Map<string, DisputeEntry> = new Map();

  /**
   * Resets internal store (used in unit testing).
   */
  public static reset(): void {
    this.disputes.clear();
  }

  /**
   * Files a dispute against a tournament match or settlement allocation.
   */
  public static fileDispute(
    tournamentId: string,
    challengerWallet: string,
    reasonCode: number,
    description: string,
    evidenceHash?: string,
    submittedAt: number = Date.now()
  ): DisputeEntry {
    const existing = this.disputes.get(tournamentId);
    if (existing && existing.status === 'ACTIVE') {
      throw new Error(`Active dispute already exists for tournament ${tournamentId}`);
    }

    const dispute: DisputeEntry = {
      tournamentId,
      challengerWallet,
      reasonCode,
      description,
      evidenceHash,
      status: 'ACTIVE',
      submittedAt,
    };

    this.disputes.set(tournamentId, dispute);

    EventBusService.broadcast('DISPUTE_FILED', {
      tournamentId,
      challengerWallet,
      reasonCode,
      description,
    });

    StoreService.logAudit('DISPUTE_SUBMITTED', challengerWallet, {
      tournamentId,
      reasonCode,
      description,
    });

    return dispute;
  }

  /**
   * Confirms dispute validity, locks settlement, and applies resolution notes.
   */
  public static resolveDispute(
    tournamentId: string,
    adminWallet: string,
    resolutionNotes: string,
    resolvedAt: number = Date.now()
  ): DisputeEntry | null {
    const dispute = this.disputes.get(tournamentId);
    if (!dispute || dispute.status !== 'ACTIVE') return null;

    dispute.status = 'RESOLVED';
    dispute.resolutionNotes = resolutionNotes;
    dispute.resolvedBy = adminWallet;
    dispute.resolvedAt = resolvedAt;

    this.disputes.set(tournamentId, dispute);

    EventBusService.broadcast('DISPUTE_RESOLVED', {
      tournamentId,
      adminWallet,
      resolutionNotes,
    });

    StoreService.logAudit('DISPUTE_RESOLVED', adminWallet, {
      tournamentId,
      resolutionNotes,
    });

    return dispute;
  }

  /**
   * Dismisses an unsubstantiated challenge and clears the settlement hold.
   */
  public static dismissDispute(
    tournamentId: string,
    adminWallet: string,
    dismissReason: string,
    resolvedAt: number = Date.now()
  ): DisputeEntry | null {
    const dispute = this.disputes.get(tournamentId);
    if (!dispute || dispute.status !== 'ACTIVE') return null;

    dispute.status = 'DISMISSED';
    dispute.resolutionNotes = dismissReason;
    dispute.resolvedBy = adminWallet;
    dispute.resolvedAt = resolvedAt;

    this.disputes.set(tournamentId, dispute);

    EventBusService.broadcast('DISPUTE_DISMISSED', {
      tournamentId,
      adminWallet,
      dismissReason,
    });

    StoreService.logAudit('DISPUTE_DISMISSED', adminWallet, {
      tournamentId,
      dismissReason,
    });

    return dispute;
  }

  /**
   * Retrieves active or historical dispute for a tournament.
   */
  public static getDispute(tournamentId: string): DisputeEntry | null {
    return this.disputes.get(tournamentId) || null;
  }

  /**
   * Checks whether a tournament currently has an active unresolved dispute.
   */
  public static isTournamentDisputed(tournamentId: string): boolean {
    const dispute = this.disputes.get(tournamentId);
    return !!dispute && dispute.status === 'ACTIVE';
  }
}
