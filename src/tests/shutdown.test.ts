import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShutdownService } from '../services/shutdown.service';
import { Server } from 'http';

describe('ShutdownService - Graceful Process Termination', () => {
  beforeEach(() => {
    ShutdownService.clearHooks();
  });

  it('registers and executes custom shutdown hooks sequentially', async () => {
    const executed: string[] = [];

    ShutdownService.registerHook('cleanup-cache', () => {
      executed.push('cache');
    });

    ShutdownService.registerHook('flush-db', async () => {
      executed.push('db');
    });

    await ShutdownService.executeShutdown(0);

    expect(executed).toEqual(['cache', 'db']);
  });

  it('closes HTTP server gracefully during shutdown', async () => {
    let serverClosed = false;
    const mockServer = {
      close: vi.fn((cb: () => void) => {
        serverClosed = true;
        cb();
      }),
    } as unknown as Server;

    ShutdownService.init(mockServer);
    await ShutdownService.executeShutdown(0);

    expect(serverClosed).toBe(true);
    expect(mockServer.close).toHaveBeenCalledTimes(1);
  });

  it('continues executing subsequent hooks even if one throws an error', async () => {
    const executed: string[] = [];

    ShutdownService.registerHook('failing-hook', () => {
      throw new Error('Explosive hook failure');
    });

    ShutdownService.registerHook('healthy-hook', () => {
      executed.push('healthy');
    });

    await ShutdownService.executeShutdown(0);

    expect(executed).toContain('healthy');
  });
});
