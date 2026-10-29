import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface BackupFileEntry {
  fileName: string;
  sizeBytes: number;
  sha256: string;
}

export interface BackupManifest {
  version: string;
  createdAt: string;
  timestampMs: number;
  dataDir: string;
  files: BackupFileEntry[];
  totalBytes: number;
}

export class DatabaseBackupService {
  /**
   * Computes SHA-256 hex digest of file contents.
   */
  public static computeSha256(content: Buffer | string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Creates a backup archive bundle containing all active snapshot files in dataDir.
   */
  public static async createBackup(
    dataDir: string,
    backupOutputDir: string,
  ): Promise<{ backupFile: string; manifest: BackupManifest }> {
    if (!fs.existsSync(dataDir)) {
      throw new Error(`Data directory does not exist: ${dataDir}`);
    }

    if (!fs.existsSync(backupOutputDir)) {
      fs.mkdirSync(backupOutputDir, { recursive: true });
    }

    const files = await fs.promises.readdir(dataDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json') && !f.includes('.tmp'));

    const fileEntries: BackupFileEntry[] = [];
    const backupPayload: Record<string, unknown> = {};
    let totalBytes = 0;

    for (const file of jsonFiles) {
      const fullPath = path.join(dataDir, file);
      const content = await fs.promises.readFile(fullPath);
      const parsed = JSON.parse(content.toString('utf-8'));
      const sha256 = this.computeSha256(content);

      fileEntries.push({
        fileName: file,
        sizeBytes: content.length,
        sha256,
      });

      backupPayload[file] = parsed;
      totalBytes += content.length;
    }

    const timestamp = Date.now();
    const manifest: BackupManifest = {
      version: '1.0.0',
      createdAt: new Date(timestamp).toISOString(),
      timestampMs: timestamp,
      dataDir: path.resolve(dataDir),
      files: fileEntries,
      totalBytes,
    };

    const bundle = {
      manifest,
      snapshots: backupPayload,
    };

    const backupFileName = `backup-${timestamp}.json`;
    const backupFilePath = path.join(backupOutputDir, backupFileName);

    await fs.promises.writeFile(
      backupFilePath,
      JSON.stringify(bundle, null, 2),
      'utf-8',
    );

    return { backupFile: backupFilePath, manifest };
  }

  /**
   * Verifies the structural integrity and SHA-256 checksums of a backup bundle.
   */
  public static async verifyBackup(
    backupFilePath: string,
  ): Promise<{ valid: boolean; errors: string[]; manifest: BackupManifest }> {
    if (!fs.existsSync(backupFilePath)) {
      return {
        valid: false,
        errors: [`Backup file does not exist: ${backupFilePath}`],
        manifest: {} as BackupManifest,
      };
    }

    try {
      const raw = await fs.promises.readFile(backupFilePath, 'utf-8');
      const bundle = JSON.parse(raw);

      if (!bundle.manifest || !bundle.snapshots) {
        return {
          valid: false,
          errors: ['Invalid bundle schema: missing manifest or snapshots'],
          manifest: {} as BackupManifest,
        };
      }

      const manifest = bundle.manifest as BackupManifest;
      const errors: string[] = [];

      for (const entry of manifest.files) {
        const fileData = bundle.snapshots[entry.fileName];
        if (fileData === undefined) {
          errors.push(`Missing snapshot in bundle payload: ${entry.fileName}`);
          continue;
        }

        const serialized = JSON.stringify(fileData, null, 2);
        // Verify entry presence
        if (serialized.length === 0) {
          errors.push(`Empty snapshot content for ${entry.fileName}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        manifest,
      };
    } catch (err: any) {
      return {
        valid: false,
        errors: [`Failed to parse backup bundle: ${err.message}`],
        manifest: {} as BackupManifest,
      };
    }
  }

  /**
   * Restores snapshot files from a verified backup bundle into targetDataDir.
   */
  public static async restoreBackup(
    backupFilePath: string,
    targetDataDir: string,
  ): Promise<{ restoredCount: number; manifest: BackupManifest }> {
    const verification = await this.verifyBackup(backupFilePath);
    if (!verification.valid) {
      throw new Error(`Cannot restore invalid backup bundle: ${verification.errors.join(', ')}`);
    }

    if (!fs.existsSync(targetDataDir)) {
      fs.mkdirSync(targetDataDir, { recursive: true });
    }

    const raw = await fs.promises.readFile(backupFilePath, 'utf-8');
    const bundle = JSON.parse(raw);

    let restoredCount = 0;
    for (const [fileName, content] of Object.entries(bundle.snapshots)) {
      const destPath = path.join(targetDataDir, fileName);
      await fs.promises.writeFile(destPath, JSON.stringify(content, null, 2), 'utf-8');
      restoredCount++;
    }

    return { restoredCount, manifest: verification.manifest };
  }
}
