import {
  Tournament,
  TournamentParticipant,
  MatchSession,
  GameResult,
  PrizePoolFunding,
  ReconciliationRecord,
  AuditEvent,
} from '../types';
import { CONFIG } from '../config';

export class StoreService {
  private static tournaments: Map<string, Tournament> = new Map();
  private static participants: Map<string, TournamentParticipant[]> = new Map();
  private static matches: Map<string, MatchSession> = new Map();
  private static results: Map<string, GameResult> = new Map();
  private static fundings: Map<string, PrizePoolFunding> = new Map(); // key: txHash
  private static consumedTxs: Set<string> = new Set();
  private static auditLogs: AuditEvent[] = [];

  static {
    // Seed initial featured tournament
    const defaultTournament: Tournament = {
      id: 'tourn-splash-001',
      name: 'Splash Rush Genesis Cup',
      description: 'The inaugural skill championship on Stellar Splash. Race the clock and claim the pool!',
      gameId: 'splash-rush',
      gameVersion: CONFIG.GAME_VERSIONS['splash-rush'],
      creatorWallet: 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB',
      prizeAsset: 'USDC',
      prizePoolAmount: 100,
      vaultAddress: CONFIG.DEFAULT_VAULT_ADDRESS,
      maxParticipants: 32,
      currentParticipants: 3,
      startTime: Date.now() - 3600 * 1000,
      endTime: Date.now() + 86400 * 1000 * 7,
      state: 'OPEN',
      fundingTxHash: 'd7a1f59c8d32be04130089aefb20468a2bf6cb8b3fa7e06a3826090e719543be',
      fundingVerifiedAt: Date.now() - 3500 * 1000,
      createdAt: Date.now() - 3600 * 1000,
      updatedAt: Date.now() - 3500 * 1000,
    };

    this.tournaments.set(defaultTournament.id, defaultTournament);

    // Seed mock participants and results for initial leaderboard
    const seedParticipants: TournamentParticipant[] = [
      {
        tournamentId: defaultTournament.id,
        playerWallet: 'GCKAZD66N6E64B44J7K3XW6P2W3V7QOXWCV7T4KQL3ZPL2GB6V2A73VU',
        joinedAt: Date.now() - 3000 * 1000,
        matchesPlayed: 2,
        bestScore: 2450,
        status: 'ACTIVE',
      },
      {
        tournamentId: defaultTournament.id,
        playerWallet: 'GD4KQL3ZPL2GB6V2A73VUX6KAZD66N6E64B44J7K3XW6P2W3V7QOXWCV',
        joinedAt: Date.now() - 2500 * 1000,
        matchesPlayed: 1,
        bestScore: 1820,
        status: 'ACTIVE',
      },
      {
        tournamentId: defaultTournament.id,
        playerWallet: 'GBOXWCV7T4KQL3ZPL2GB6V2A73VUX6KAZD66N6E64B44J7K3XW6P2W3V',
        joinedAt: Date.now() - 2000 * 1000,
        matchesPlayed: 1,
        bestScore: 1200,
        status: 'ACTIVE',
      },
    ];

    this.participants.set(defaultTournament.id, seedParticipants);

    // Record funding for genesis cup
    this.fundings.set(defaultTournament.fundingTxHash!, {
      tournamentId: defaultTournament.id,
      txHash: defaultTournament.fundingTxHash!,
      funderWallet: defaultTournament.creatorWallet,
      destinationVault: defaultTournament.vaultAddress,
      asset: defaultTournament.prizeAsset,
      amount: defaultTournament.prizePoolAmount,
      ledger: 4892100,
      verifiedAt: defaultTournament.fundingVerifiedAt!,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${defaultTournament.fundingTxHash}`,
      status: 'CONFIRMED',
    });
    this.consumedTxs.add(defaultTournament.fundingTxHash!);
  }

  // --- Tournaments ---
  public static getAllTournaments(): Tournament[] {
    return Array.from(this.tournaments.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public static getTournamentById(id: string): Tournament | undefined {
    return this.tournaments.get(id);
  }

  public static saveTournament(tournament: Tournament): void {
    tournament.updatedAt = Date.now();
    this.tournaments.set(tournament.id, tournament);
    this.logAudit('TOURNAMENT_SAVED', tournament.creatorWallet, { tournamentId: tournament.id });
  }

  // --- Participants ---
  public static getParticipants(tournamentId: string): TournamentParticipant[] {
    return this.participants.get(tournamentId) || [];
  }

  public static getParticipant(tournamentId: string, playerWallet: string): TournamentParticipant | undefined {
    const list = this.getParticipants(tournamentId);
    return list.find((p) => p.playerWallet === playerWallet);
  }

  public static addParticipant(participant: TournamentParticipant): void {
    const list = this.getParticipants(participant.tournamentId);
    list.push(participant);
    this.participants.set(participant.tournamentId, list);

    const t = this.getTournamentById(participant.tournamentId);
    if (t) {
      t.currentParticipants = list.length;
      if (t.maxParticipants > 0 && t.currentParticipants >= t.maxParticipants) {
        t.state = 'FULL';
      }
      this.saveTournament(t);
    }

    this.logAudit('PARTICIPANT_JOINED', participant.playerWallet, {
      tournamentId: participant.tournamentId,
    });
  }

  public static updateParticipantScore(tournamentId: string, playerWallet: string, score: number): void {
    const list = this.getParticipants(tournamentId);
    const p = list.find((item) => item.playerWallet === playerWallet);
    if (p) {
      p.matchesPlayed += 1;
      if (score > p.bestScore) {
        p.bestScore = score;
      }
    }
  }

  // --- Matches & Sessions ---
  public static createMatchSession(session: MatchSession): void {
    this.matches.set(session.matchId, session);
    this.logAudit('MATCH_STARTED', session.playerWallet, { matchId: session.matchId });
  }

  public static getMatchSession(matchId: string): MatchSession | undefined {
    return this.matches.get(matchId);
  }

  public static updateMatchSession(session: MatchSession): void {
    this.matches.set(session.matchId, session);
  }

  // --- Game Results ---
  public static saveGameResult(result: GameResult): void {
    this.results.set(result.matchId, result);
    this.logAudit('RESULT_RECORDED', result.playerWallet, {
      matchId: result.matchId,
      finalScore: result.finalScore,
      resultHash: result.resultHash,
    });
  }

  public static getGameResult(matchId: string): GameResult | undefined {
    return this.results.get(matchId);
  }

  public static getAllResultsForTournament(tournamentId: string): GameResult[] {
    return Array.from(this.results.values())
      .filter((r) => r.tournamentId === tournamentId)
      .sort((a, b) => b.finalScore - a.finalScore);
  }

  // --- Prize Pool Fundings & Idempotency ---
  public static isTxConsumed(txHash: string): boolean {
    return this.consumedTxs.has(txHash);
  }

  public static recordFunding(funding: PrizePoolFunding): void {
    this.fundings.set(funding.txHash, funding);
    this.consumedTxs.add(funding.txHash);
    this.logAudit('PRIZE_FUNDED', funding.funderWallet, {
      tournamentId: funding.tournamentId,
      txHash: funding.txHash,
      amount: funding.amount,
    });
  }

  public static getFundingByTx(txHash: string): PrizePoolFunding | undefined {
    return this.fundings.get(txHash);
  }

  public static getFundingForTournament(tournamentId: string): PrizePoolFunding | undefined {
    for (const f of this.fundings.values()) {
      if (f.tournamentId === tournamentId) return f;
    }
    return undefined;
  }

  // --- Reconciliation ---
  public static getReconciliation(tournamentId: string): ReconciliationRecord {
    const t = this.getTournamentById(tournamentId);
    if (!t) {
      return {
        tournamentId,
        expectedAmount: 0,
        onChainAmount: 0,
        asset: 'UNKNOWN',
        status: 'RECONCILIATION_REQUIRED',
        lastCheckedAt: Date.now(),
        details: 'Tournament not found.',
      };
    }

    const funding = this.getFundingForTournament(tournamentId);
    const onChainAmount = funding && funding.status === 'CONFIRMED' ? funding.amount : 0;
    const isReconciled = onChainAmount >= t.prizePoolAmount;

    return {
      tournamentId,
      expectedAmount: t.prizePoolAmount,
      onChainAmount,
      asset: t.prizeAsset,
      status: isReconciled ? 'RECONCILED' : 'RECONCILIATION_REQUIRED',
      lastCheckedAt: Date.now(),
      details: isReconciled
        ? `Prize pool is fully backed on-chain (${onChainAmount} ${t.prizeAsset}).`
        : `Discrepancy detected: Expected ${t.prizePoolAmount} ${t.prizeAsset}, on-chain holds ${onChainAmount}.`,
    };
  }

  // --- Audit ---
  public static logAudit(eventType: string, actor: string, details: Record<string, unknown>): void {
    this.auditLogs.push({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: Date.now(),
      eventType,
      actor,
      details,
    });
  }

  public static getAuditLogs(): AuditEvent[] {
    return [...this.auditLogs];
  }
}
