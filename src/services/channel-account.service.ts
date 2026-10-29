import {
  ChannelAccount,
  ChannelAccountMetrics,
  SubmissionQueueItem,
} from '../types/channel-account';

export class ChannelAccountManagerService {
  private channels: Map<string, ChannelAccount> = new Map();
  private submissionQueue: Map<string, SubmissionQueueItem> = new Map();
  private queueOrder: string[] = [];

  public registerChannel(publicKey: string, secretKey: string, balanceStroops?: string): void {
    this.channels.set(publicKey, {
      publicKey,
      secretKey,
      isLocked: false,
      balanceStroops: balanceStroops || '100000000',
    });
  }

  public acquireChannel(): ChannelAccount | null {
    for (const channel of this.channels.values()) {
      if (!channel.isLocked) {
        channel.isLocked = true;
        channel.lastUsedAt = Date.now();
        return channel;
      }
    }
    return null;
  }

  public releaseChannel(publicKey: string, lastSequenceNumber?: string): void {
    const channel = this.channels.get(publicKey);
    if (channel) {
      channel.isLocked = false;
      if (lastSequenceNumber) {
        channel.lastSequenceNumber = lastSequenceNumber;
      }
    }
  }

  public enqueueSubmission(
    item: Omit<SubmissionQueueItem, 'id' | 'enqueuedAt' | 'attempts' | 'status'>
  ): SubmissionQueueItem {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const submission: SubmissionQueueItem = {
      ...item,
      id,
      enqueuedAt: Date.now(),
      status: 'pending',
      attempts: 0,
    };
    this.submissionQueue.set(id, submission);
    this.queueOrder.push(id);
    return submission;
  }

  public getNextPendingSubmission(): SubmissionQueueItem | null {
    for (const id of this.queueOrder) {
      const item = this.submissionQueue.get(id);
      if (item && item.status === 'pending') {
        return item;
      }
    }
    return null;
  }

  public updateSubmissionStatus(
    id: string,
    status: SubmissionQueueItem['status'],
    txHash?: string,
    error?: string
  ): void {
    const item = this.submissionQueue.get(id);
    if (item) {
      item.status = status;
      if (txHash) item.txHash = txHash;
      if (error) item.error = error;
      if (status === 'submitting') {
        item.attempts += 1;
      }
    }
  }

  public getSubmission(id: string): SubmissionQueueItem | undefined {
    return this.submissionQueue.get(id);
  }

  public getQueueItems(): SubmissionQueueItem[] {
    return Array.from(this.submissionQueue.values());
  }

  public getChannels(): ChannelAccount[] {
    return Array.from(this.channels.values());
  }

  public getMetrics(): ChannelAccountMetrics {
    const totalChannels = this.channels.size;
    let busyChannels = 0;
    for (const ch of this.channels.values()) {
      if (ch.isLocked) busyChannels++;
    }
    return {
      totalChannels,
      availableChannels: totalChannels - busyChannels,
      busyChannels,
      queueDepth: this.submissionQueue.size,
    };
  }

  public clear(): void {
    this.channels.clear();
    this.submissionQueue.clear();
    this.queueOrder = [];
  }
}

export const channelAccountManager = new ChannelAccountManagerService();

