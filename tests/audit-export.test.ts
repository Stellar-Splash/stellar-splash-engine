import { describe, it, expect, beforeEach } from 'vitest';
import { StoreService } from '../src/services/store.service';
import { AuditExportService } from '../src/services/audit-export.service';
import { Tournament } from '../src/types';

describe('AuditExportService', () => {
  beforeEach(() => {
    StoreService.reset();
  });

  it('generates a tamper-evident audit report with SHA-256 integrity hash', () => {
    const tournament: Tournament = {
      id: 'tourn-aud-1',
      name: 'Audit Cup 2026',
      description: 'Audit test tournament',
      gameId: 'splash-rush',
      gameVersion: '1.0.0',
      creatorWallet: 'GA_ADMIN',
      prizeAsset: 'USDC',
      prizePoolAmount: 1000,
      vaultAddress: 'CACHWJEZY6JN36VFACWRQ7FP4T5EPRRRNBVLOSFHXTJHETZY36JD7QYJ',
      maxParticipants: 16,
      currentParticipants: 8,
      startTime: 1000,
      endTime: 2000,
      state: 'COMPLETED',
      createdAt: 500,
      updatedAt: 2000,
    };

    StoreService.saveTournament(tournament);
    StoreService.logAudit('TEST_EVENT', 'GA_ADMIN', { tournamentId: 'tourn-aud-1' }, 1500);

    const report = AuditExportService.generateReport('tourn-aud-1', 5000);

    expect(report.tournamentId).toBe('tourn-aud-1');
    expect(report.tournament?.name).toBe('Audit Cup 2026');
    expect(report.auditTrail.length).toBe(2);
    expect(report.integrityHash).toMatch(/^[a-f0-9]{64}$/);

    // Verify integrity
    expect(AuditExportService.verifyReportIntegrity(report)).toBe(true);

    // Tampering invalidates verification
    const tampered = { ...report, tournamentId: 'tourn-tampered' };
    expect(AuditExportService.verifyReportIntegrity(tampered)).toBe(false);
  });
});
