import { describe, it, expect } from 'vitest';
import { ForensicPackagerService } from '../src/services/forensic-packager.service';

describe('ForensicPackagerService', () => {
  it('assembles and signs forensic replay package', () => {
    const pkg = ForensicPackagerService.assemblePackage({
      matchId: 'MATCH_TEST_101',
      tournamentId: 99,
      playerWallets: ['GPLAYER_1', 'GPLAYER_2'],
      gameTitle: 'Aqua Dash',
      seed: 424242,
      tickCount: 3600,
      finalScores: { GPLAYER_1: 1500, GPLAYER_2: 1200 },
      isFlagged: false,
      antiCheatReasons: [],
    });

    expect(pkg.matchId).toBe('MATCH_TEST_101');
    expect(pkg.verificationHash).toBeDefined();
    expect(pkg.serverAttestationSignature).toBeDefined();
    expect(pkg.packageVersion).toBe('1.0.0');

    // Verification should pass
    const isValid = ForensicPackagerService.verifyPackageIntegrity(pkg);
    expect(isValid).toBe(true);
  });

  it('rejects tampered forensic package', () => {
    const pkg = ForensicPackagerService.assemblePackage({
      matchId: 'MATCH_TEST_102',
      tournamentId: 99,
      playerWallets: ['GPLAYER_1', 'GPLAYER_2'],
      gameTitle: 'Aqua Dash',
      seed: 12345,
      tickCount: 1800,
      finalScores: { GPLAYER_1: 800, GPLAYER_2: 950 },
      isFlagged: false,
      antiCheatReasons: [],
    });

    // Tamper with final scores
    const tampered = {
      ...pkg,
      finalScores: { GPLAYER_1: 10000, GPLAYER_2: 950 },
    };

    const isValid = ForensicPackagerService.verifyPackageIntegrity(tampered);
    expect(isValid).toBe(false);
  });
});
