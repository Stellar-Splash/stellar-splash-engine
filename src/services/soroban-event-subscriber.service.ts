import { SorobanContractEvent, EventFilterCriteria } from '../types/event-subscriber';
import { CONFIG } from '../config';

export class SorobanEventSubscriberService {
  private rpcUrl: string;
  private recentEvents: SorobanContractEvent[] = [];
  private maxStoredEvents: number = 200;
  private listeners: ((event: SorobanContractEvent) => void)[] = [];

  constructor(rpcUrl: string = CONFIG.SOROBAN_RPC_URL) {
    this.rpcUrl = rpcUrl;
  }

  public addListener(listener: (event: SorobanContractEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public recordEvent(event: SorobanContractEvent): void {
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.maxStoredEvents) {
      this.recentEvents.shift();
    }
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Listener error ignored
      }
    }
  }

  public getRecentEvents(limit: number = 50): SorobanContractEvent[] {
    return this.recentEvents.slice(-limit);
  }

  public async fetchEvents(filter: EventFilterCriteria = {}): Promise<SorobanContractEvent[]> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getEvents',
          params: {
            startLedger: filter.startLedger,
            filters: filter.contractIds
              ? filter.contractIds.map((cid) => ({
                  type: 'contract',
                  contractIds: [cid],
                  topics: filter.topics,
                }))
              : undefined,
            pagination: { limit: filter.limit || 20 },
          },
        }),
      });

      if (!response.ok) {
        return this.getRecentEvents(filter.limit || 20);
      }

      const data = (await response.json()) as any;
      if (data.result && Array.isArray(data.result.events)) {
        const events: SorobanContractEvent[] = data.result.events.map((e: any) => ({
          id: e.id || `evt_${Date.now()}`,
          type: e.type || 'contract',
          ledger: e.ledger || 0,
          ledgerClosedAt: e.ledgerClosedAt || new Date().toISOString(),
          contractId: e.contractId || CONFIG.CONTRACT_ID,
          topic: Array.isArray(e.topic) ? e.topic : [],
          value: e.value,
          inSuccessfulContractCall: e.inSuccessfulContractCall ?? true,
        }));
        for (const evt of events) {
          this.recordEvent(evt);
        }
        return events;
      }
      return this.getRecentEvents(filter.limit || 20);
    } catch {
      return this.getRecentEvents(filter.limit || 20);
    }
  }

  public clear(): void {
    this.recentEvents = [];
    this.listeners = [];
  }
}

export const sorobanEventSubscriber = new SorobanEventSubscriberService();
