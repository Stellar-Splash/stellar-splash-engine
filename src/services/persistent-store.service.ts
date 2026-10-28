import fs from 'fs';
import path from 'path';

export interface PersistentStoreConfig {
  dataDir: string;
}

export class PersistentStoreService {
  private dataDir: string;

  constructor(config?: Partial<PersistentStoreConfig>) {
    this.dataDir = config?.dataDir || path.resolve(process.cwd(), 'data');
    this.ensureDirectoryExists(this.dataDir);
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Performs an atomic file write using a temporary file and atomic rename.
   * Prevents corrupted records if the server process terminates abruptly.
   */
  public async saveSnapshot<T>(fileName: string, data: T): Promise<void> {
    this.ensureDirectoryExists(this.dataDir);
    const targetPath = path.join(this.dataDir, fileName);
    const tempPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`;

    const serialized = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(tempPath, serialized, 'utf-8');
    await fs.promises.rename(tempPath, targetPath);
  }

  /**
   * Loads a JSON snapshot from disk with an optional fallback if the file does not exist.
   */
  public async loadSnapshot<T>(fileName: string, fallback: T): Promise<T> {
    const targetPath = path.join(this.dataDir, fileName);
    if (!fs.existsSync(targetPath)) {
      return fallback;
    }

    try {
      const content = await fs.promises.readFile(targetPath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return fallback;
    }
  }

  /**
   * Deletes a snapshot file if it exists.
   */
  public async deleteSnapshot(fileName: string): Promise<boolean> {
    const targetPath = path.join(this.dataDir, fileName);
    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath);
      return true;
    }
    return false;
  }
}
