import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DatabaseBackupService } from '../scripts/db-backup';

describe('DatabaseBackupService', () => {
  const testDir = path.resolve(__dirname, '../data/test-backup-suite');
  const srcDir = path.join(testDir, 'src-data');
  const backupDir = path.join(testDir, 'backups');
  const restoreDir = path.join(testDir, 'restored');

  beforeEach(async () => {
    await fs.promises.mkdir(srcDir, { recursive: true });
    await fs.promises.mkdir(backupDir, { recursive: true });
    await fs.promises.mkdir(restoreDir, { recursive: true });

    // Seed test snapshot files
    await fs.promises.writeFile(
      path.join(srcDir, 'tournaments.json'),
      JSON.stringify([{ id: 't1', title: 'Test Cup' }], null, 2),
      'utf-8',
    );
    await fs.promises.writeFile(
      path.join(srcDir, 'players.json'),
      JSON.stringify([{ id: 'p1', handle: 'AstroPlayer' }], null, 2),
      'utf-8',
    );
  });

  afterEach(async () => {
    if (fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }
  });

  it('creates a valid backup bundle with manifest metadata', async () => {
    const { backupFile, manifest } = await DatabaseBackupService.createBackup(srcDir, backupDir);

    expect(fs.existsSync(backupFile)).toBe(true);
    expect(manifest.files.length).toBe(2);
    expect(manifest.totalBytes).toBeGreaterThan(0);
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.files.map((f) => f.fileName)).toContain('tournaments.json');
    expect(manifest.files.map((f) => f.fileName)).toContain('players.json');
  });

  it('verifies valid and corrupted backups correctly', async () => {
    const { backupFile } = await DatabaseBackupService.createBackup(srcDir, backupDir);

    const validResult = await DatabaseBackupService.verifyBackup(backupFile);
    expect(validResult.valid).toBe(true);
    expect(validResult.errors.length).toBe(0);

    // Corrupt the backup file
    const corruptedPath = path.join(backupDir, 'corrupted.json');
    await fs.promises.writeFile(corruptedPath, '{"invalid_json": true,', 'utf-8');

    const invalidResult = await DatabaseBackupService.verifyBackup(corruptedPath);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.length).toBeGreaterThan(0);
  });

  it('restores snapshot files from a backup bundle reliably', async () => {
    const { backupFile } = await DatabaseBackupService.createBackup(srcDir, backupDir);

    const { restoredCount } = await DatabaseBackupService.restoreBackup(backupFile, restoreDir);
    expect(restoredCount).toBe(2);

    const restoredTournaments = JSON.parse(
      await fs.promises.readFile(path.join(restoreDir, 'tournaments.json'), 'utf-8'),
    );
    expect(restoredTournaments[0].title).toBe('Test Cup');

    const restoredPlayers = JSON.parse(
      await fs.promises.readFile(path.join(restoreDir, 'players.json'), 'utf-8'),
    );
    expect(restoredPlayers[0].handle).toBe('AstroPlayer');
  });
});
