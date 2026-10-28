import { Server } from 'http';
import { PersistentStoreService } from './persistent-store.service';
import { StoreService } from './store.service';

export type ShutdownHook = () => Promise<void> | void;

export class ShutdownService {
  private static hooks: Array<{ name: string; fn: ShutdownHook }> = [];
  private static isShuttingDown = false;
  private static server: Server | null = null;
  private static timeoutMs = 5000;

  /**
   * Registers a callback hook to execute during graceful termination.
   */
  public static registerHook(name: string, fn: ShutdownHook): void {
    this.hooks.push({ name, fn });
  }

  /**
   * Clears registered hooks (useful for unit tests).
   */
  public static clearHooks(): void {
    this.hooks = [];
    this.isShuttingDown = false;
    this.server = null;
  }

  /**
   * Attaches the HTTP server and binds SIGINT / SIGTERM process listeners.
   */
  public static init(server?: Server, timeoutMs: number = 5000): void {
    this.server = server ?? null;
    this.timeoutMs = timeoutMs;

    // Register built-in storage flush hook
    this.registerHook('persistent-snapshot-flush', async () => {
      const store = new PersistentStoreService();
      await store.saveSnapshot('engine-snapshot.json', StoreService.exportAll());
    });

    // Attach OS signals
    const onSignal = (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);
      this.executeShutdown(0);
    };

    process.once('SIGINT', () => onSignal('SIGINT'));
    process.once('SIGTERM', () => onSignal('SIGTERM'));
  }

  /**
   * Executes graceful shutdown sequence with deadline enforcement.
   */
  public static async executeShutdown(exitCode = 0): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    this.isShuttingDown = true;

    // Force exit timer if graceful drain hangs
    const forceExitTimer = setTimeout(() => {
      console.error('⚠️ Graceful shutdown timed out. Forcing process exit.');
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
    }, this.timeoutMs);

    if (forceExitTimer.unref) {
      forceExitTimer.unref();
    }

    try {
      // 1. Close HTTP server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server!.close(() => {
            console.log('✅ Inbound HTTP server closed.');
            resolve();
          });
        });
      }

      // 2. Execute shutdown hooks
      for (const hook of this.hooks) {
        try {
          console.log(`⏳ Executing shutdown hook: ${hook.name}...`);
          await hook.fn();
          console.log(`✅ Hook completed: ${hook.name}`);
        } catch (err) {
          console.error(`❌ Hook ${hook.name} failed during shutdown:`, err);
        }
      }

      clearTimeout(forceExitTimer);
      console.log('🏁 Graceful shutdown completed cleanly.');

      if (process.env.NODE_ENV !== 'test') {
        process.exit(exitCode);
      }
    } catch (err) {
      console.error('❌ Error during shutdown execution:', err);
      clearTimeout(forceExitTimer);
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
    }
  }
}
