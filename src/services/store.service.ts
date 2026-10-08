import {
  Tournament,
  TournamentParticipant,
  MatchSession,
  GameResult,
  PrizePoolFunding,
  ReconciliationRecord,
  AuditEvent,
  ResultVerification,
  FinalRankingRecord,
  PrizeAgreement,
} from '../types';
import { CONFIG } from '../config';
import { AgreementService } from './agreement.service';

export class StoreService {
  private static tournaments: Map<string, Tournament> = new Map();
  private static participants: Map<string, TournamentParticipant[]> = new Map();
  private static matches: Map<string, MatchSession> = new Map();
  private static results: Map<string, GameResult> = new Map();
  private static fundings: Map<string, PrizePoolFunding> = new Map(); // key: txHash
  private static consumedTxs: Set<string> = new Set();
  private static auditLogs: AuditEvent[] = [];

  // Verification & Agreement storage
  private static verifications: Map<string, ResultVerification> = new Map(); // key: matchId
  private static rankings: Map<string, FinalRankingRecord> = new Map(); // key: tournamentId
  private static agreements: Map<string, PrizeAgreement[]> = new Map(); // key: tournamentId -> versions

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
      activeAgreementVersion: 1,
      createdAt: Date.now() - 3600 * 1000,
      updatedAt: Date.now() - 3500 * 1000,
    };

    this.tournaments.set(defaultTournament.id, defaultTournament);

    // Seed mock participants
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

    // Seed verified result for player 1
    const seedResult: GameResult = {
      matchId: 'match-genesis-001',
      tournamentId: defaultTournament.id,
      playerWallet: 'GCKAZD66N6E64B44J7K3XW6P2W3V7QOXWCV7T4KQL3ZPL2GB6V2A73VU',
      gameVersion: '1.0.0',
      startTime: Date.now() - 2800 * 1000,
      endTime: Date.now() - 2755 * 1000,
      durationMs: 45000,
      eventsCount: 22,
      baseScore: 1800,
      comboBonus: 400,
      multiplierBonus: 250,
      penalties: 0,
      finalScore: 2450,
      accuracy: 95,
      maxCombo: 12,
      resultHash: '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
      submittedAt: Date.now() - 2750 * 1000,
      verified: true,
    };
    this.results.set(seedResult.matchId, seedResult);

    // Seed session for match-genesis-001
    this.matches.set(seedResult.matchId, {
      matchId: seedResult.matchId,
      tournamentId: defaultTournament.id,
      playerWallet: seedResult.playerWallet,
      gameId: 'splash-rush',
      gameVersion: '1.0.0',
      sessionToken: 'seed-token-genesis',
      startTime: seedResult.startTime,
      endTime: seedResult.endTime,
      status: 'VERIFIED',
      events: [],
    });

    // Seed verification record
    this.verifications.set(seedResult.matchId, {
      verificationId: 'verif-genesis-001',
      matchId: seedResult.matchId,
      tournamentId: defaultTournament.id,
      playerWallet: seedResult.playerWallet,
      gameVersion: seedResult.gameVersion,
      submittedScore: 2450,
      replayedScore: 2450,
      scoreMatch: true,
      resultHash: seedResult.resultHash,
      verificationAlgorithm: 'DETERMINISTIC_REPLAY_ENGINE',
      verificationVersion: '1.0.0',
      verifier: 'verifier.stellar-splash.org',
      verifiedAt: Date.now() - 2740 * 1000,
      status: 'VERIFIED',
      attestation: {
        attestationId: 'attest-genesis-001',
        tournamentId: defaultTournament.id,
        matchId: seedResult.matchId,
        playerWallet: seedResult.playerWallet,
        resultHash: seedResult.resultHash,
        finalScore: 2450,
        verificationVersion: '1.0.0',
        verifierIdentity: 'verifier.stellar-splash.org',
        timestamp: Date.now() - 2740 * 1000,
        attestationDigest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
    });

    // Seed Prize Agreement v1 (Locked)
    const seedAgreement = AgreementService.createAgreement({
      tournamentId: defaultTournament.id,
      version: 1,
      prizeAsset: 'USDC',
      prizePoolAmount: 100,
      allocationRules: [
        { rank: 1, basisPoints: 5000, label: '1st Place (50%)' },
        { rank: 2, basisPoints: 3000, label: '2nd Place (30%)' },
        { rank: 3, basisPoints: 2000, label: '3rd Place (20%)' },
      ],
      createdBy: defaultTournament.creatorWallet,
    });
    seedAgreement.status = 'LOCKED';
    seedAgreement.approvedBy = defaultTournament.creatorWallet;
    seedAgreement.approvedAt = Date.now() - 3500 * 1000;
    seedAgreement.lockedAt = Date.now() - 3500 * 1000;

    this.agreements.set(defaultTournament.id, [seedAgreement]);

    // Record funding
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

  // --- Verifications ---
  public static saveVerification(verification: ResultVerification): void {
    this.verifications.set(verification.matchId, verification);
    this.logAudit('RESULT_VERIFIED', verification.playerWallet, {
      matchId: verification.matchId,
      replayedScore: verification.replayedScore,
      status: verification.status,
      resultHash: verification.resultHash,
    });
  }

  public static getVerification(matchId: string): ResultVerification | undefined {
    return this.verifications.get(matchId);
  }

  // --- Final Rankings ---
  public static saveRanking(ranking: FinalRankingRecord): void {
    this.rankings.set(ranking.tournamentId, ranking);

    const t = this.getTournamentById(ranking.tournamentId);
    if (t) {
      t.finalRankingHash = ranking.rankingHash;
      t.state = 'FINALIZED';
      this.saveTournament(t);
    }

    this.logAudit('RANKING_FINALIZED', ranking.finalizedBy, {
      tournamentId: ranking.tournamentId,
      rankingHash: ranking.rankingHash,
      count: ranking.entries.length,
    });
  }

  public static getRanking(tournamentId: string): FinalRankingRecord | undefined {
    return this.rankings.get(tournamentId);
  }

  // --- Prize Agreements ---
  public static saveAgreement(agreement: PrizeAgreement): void {
    const list = this.agreements.get(agreement.tournamentId) || [];
    const existingIndex = list.findIndex((a) => a.version === agreement.version);

    if (existingIndex >= 0) {
      const prev = list[existingIndex];
      // Invariant: Once locked, an agreement cannot have its material terms modified
      if (prev.status === 'LOCKED' && agreement.status !== 'SUPERSEDED') {
        if (
          prev.prizePoolAmount !== agreement.prizePoolAmount ||
          prev.prizeAsset !== agreement.prizeAsset ||
          prev.version !== agreement.version ||
          prev.agreementHash !== agreement.agreementHash ||
          JSON.stringify(prev.allocationRules) !== JSON.stringify(agreement.allocationRules)
        ) {
          throw new Error('IMMUTABLE_AGREEMENT: Locked agreements cannot be modified.');
        }
      }
      list[existingIndex] = { ...agreement };
    } else {
      list.push({ ...agreement });
    }

    this.agreements.set(agreement.tournamentId, list);

    const t = this.getTournamentById(agreement.tournamentId);
    if (t) {
      t.activeAgreementVersion = agreement.version;
      this.saveTournament(t);
    }

    this.logAudit('AGREEMENT_SAVED', agreement.createdBy, {
      tournamentId: agreement.tournamentId,
      version: agreement.version,
      status: agreement.status,
      agreementHash: agreement.agreementHash,
    });
  }

  public static getAgreementsForTournament(tournamentId: string): PrizeAgreement[] {
    return this.agreements.get(tournamentId) || [];
  }

  public static getAgreement(tournamentId: string, version: number): PrizeAgreement | undefined {
    const list = this.getAgreementsForTournament(tournamentId);
    return list.find((a) => a.version === version);
  }

  public static getActiveAgreement(tournamentId: string): PrizeAgreement | undefined {
    const list = this.getAgreementsForTournament(tournamentId);
    // Prefer LOCKED agreements, otherwise highest version
    const locked = list.filter((a) => a.status === 'LOCKED').sort((a, b) => b.version - a.version);
    if (locked.length > 0) return locked[0];

    return list.sort((a, b) => b.version - a.version)[0];
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
        status: 'RECONCILED',
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
