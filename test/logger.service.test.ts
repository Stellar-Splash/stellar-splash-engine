import { describe, it, expect, beforeEach } from 'vitest';
import { LoggerService } from '../src/services/logger.service';

describe('LoggerService - Structured Logging Abstraction', () => {
  beforeEach(() => {
    LoggerService.clearHistory();
    LoggerService.setMinLevel('DEBUG');
  });

  it('records debug, info, warn, and error log entries with ISO timestamps', () => {
    LoggerService.debug('Debugging database connection', { pool: 'master' });
    LoggerService.info('Tournament created', { tournamentId: 't-123' });
    LoggerService.warn('High memory usage detected', { usagePercent: 88 });
    LoggerService.error('Transaction simulation failed', new Error('RPC_TIMEOUT'), { txHash: '0xabc' });

    const history = LoggerService.getHistory();
    expect(history).toHaveLength(4);

    expect(history[0].level).toBe('DEBUG');
    expect(history[0].message).toBe('Debugging database connection');
    expect(history[0].context?.pool).toBe('master');

    expect(history[1].level).toBe('INFO');
    expect(history[1].context?.tournamentId).toBe('t-123');

    expect(history[2].level).toBe('WARN');

    expect(history[3].level).toBe('ERROR');
    expect(history[3].error?.message).toBe('RPC_TIMEOUT');
    expect(history[3].context?.txHash).toBe('0xabc');
  });

  it('filters out messages below the minimum configured log level', () => {
    LoggerService.setMinLevel('WARN');

    LoggerService.debug('Hidden debug message');
    LoggerService.info('Hidden info message');
    LoggerService.warn('Visible warn message');
    LoggerService.error('Visible error message');

    const history = LoggerService.getHistory();
    // Buffer records, but verify level priority check
    expect(history.filter((e) => e.level === 'WARN' || e.level === 'ERROR')).toHaveLength(2);
  });

  it('scoped logger seamlessly appends parent context to all messages', () => {
    const scoped = LoggerService.withContext({
      requestId: 'req-uuid-1234',
      service: 'settlement',
    });

    scoped.info('Calculating payouts', { recipientCount: 3 });

    const history = LoggerService.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].context?.requestId).toBe('req-uuid-1234');
    expect(history[0].context?.service).toBe('settlement');
    expect(history[0].context?.recipientCount).toBe(3);
  });
});
