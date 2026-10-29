import { describe, it, expect, beforeEach } from 'vitest';
import { ChannelAccountManagerService } from '../src/services/channel-account.service';

describe('ChannelAccountManagerService', () => {
  let manager: ChannelAccountManagerService;

  beforeEach(() => {
    manager = new ChannelAccountManagerService();
  });

  it('registers channel accounts properly', () => {
    manager.registerChannel('GACCOUNT1', 'SSECRET1', '50000000');
    const metrics = manager.getMetrics();

    expect(metrics.totalChannels).toBe(1);
    expect(metrics.availableChannels).toBe(1);
    expect(metrics.busyChannels).toBe(0);
    expect(metrics.queueDepth).toBe(0);
  });

  it('acquires and locks available channels', () => {
    manager.registerChannel('GACCOUNT1', 'SSECRET1');
    const ch = manager.acquireChannel();

    expect(ch).not.toBeNull();
    expect(ch?.publicKey).toBe('GACCOUNT1');
    expect(ch?.isLocked).toBe(true);

    // Second acquire should return null since all are locked
    const ch2 = manager.acquireChannel();
    expect(ch2).toBeNull();

    const metrics = manager.getMetrics();
    expect(metrics.availableChannels).toBe(0);
    expect(metrics.busyChannels).toBe(1);
  });

  it('releases locked channels with updated sequence number', () => {
    manager.registerChannel('GACCOUNT1', 'SSECRET1');
    const ch = manager.acquireChannel();
    expect(ch).not.toBeNull();

    manager.releaseChannel('GACCOUNT1', '123456789');

    const metrics = manager.getMetrics();
    expect(metrics.availableChannels).toBe(1);
    expect(metrics.busyChannels).toBe(0);

    const reacquired = manager.acquireChannel();
    expect(reacquired?.publicKey).toBe('GACCOUNT1');
    expect(reacquired?.lastSequenceNumber).toBe('123456789');
  });

  it('enqueues and processes submission queue items', () => {
    const item1 = manager.enqueueSubmission({
      tournamentId: 101,
      transactionXdr: 'AAAA1111',
      action: 'settle',
    });
    const item2 = manager.enqueueSubmission({
      tournamentId: 102,
      transactionXdr: 'BBBB2222',
      action: 'register',
    });

    expect(item1.id).toBeDefined();
    expect(item1.status).toBe('pending');
    expect(manager.getMetrics().queueDepth).toBe(2);

    const next = manager.getNextPendingSubmission();
    expect(next?.id).toBe(item1.id);

    manager.updateSubmissionStatus(item1.id, 'confirmed', 'tx_hash_1');
    expect(manager.getSubmission(item1.id)?.status).toBe('confirmed');

    const next2 = manager.getNextPendingSubmission();
    expect(next2?.id).toBe(item2.id);

    manager.updateSubmissionStatus(item2.id, 'failed', undefined, 'insufficient fee');
    expect(manager.getSubmission(item2.id)?.status).toBe('failed');
  });
});
