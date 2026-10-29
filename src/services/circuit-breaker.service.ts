import {
  CircuitBreakerConfig,
  CircuitBreakerStatus,
  CircuitState,
  RpcNodeEndpoint,
} from '../types/circuit-breaker';
import { CONFIG } from '../config';

export class CircuitBreakerService {
  private state: CircuitState = 'CLOSED';
  private nodes: RpcNodeEndpoint[] = [];
  private activeNodeIndex: number = 0;
  private totalTrips: number = 0;
  private lastTripTimestamp?: number;
  private config: CircuitBreakerConfig;

  constructor(
    nodes?: string[],
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    const defaultUrls = nodes && nodes.length > 0 ? nodes : [CONFIG.SOROBAN_RPC_URL, 'https://soroban-testnet.stellar.org'];
    this.nodes = defaultUrls.map((url, idx) => ({
      url,
      name: `rpc-node-${idx + 1}`,
      isHealthy: true,
      consecutiveFailures: 0,
      lastLatencyMs: 0,
      p95LatencyMs: 0,
    }));

    this.config = {
      failureThreshold: config.failureThreshold || 3,
      recoveryTimeMs: config.recoveryTimeMs || 15_000,
      requestTimeoutMs: config.requestTimeoutMs || 5_000,
    };
  }

  public getActiveEndpoint(): string {
    return this.nodes[this.activeNodeIndex].url;
  }

  public getStatus(): CircuitBreakerStatus {
    this.checkHalfOpenTransition();
    return {
      state: this.state,
      activeEndpoint: this.getActiveEndpoint(),
      nodes: this.nodes.map((n) => ({ ...n })),
      totalTrips: this.totalTrips,
      lastTripTimestamp: this.lastTripTimestamp,
    };
  }

  public recordSuccess(latencyMs: number): void {
    const current = this.nodes[this.activeNodeIndex];
    current.isHealthy = true;
    current.consecutiveFailures = 0;
    current.lastLatencyMs = latencyMs;
    // Rolling p95 approximation
    current.p95LatencyMs = current.p95LatencyMs === 0 ? latencyMs : Math.round(current.p95LatencyMs * 0.95 + latencyMs * 0.05);

    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  public recordFailure(): void {
    const current = this.nodes[this.activeNodeIndex];
    current.consecutiveFailures++;
    current.lastFailureTimestamp = Date.now();

    if (current.consecutiveFailures >= this.config.failureThreshold) {
      current.isHealthy = false;
      this.tripCircuit();
      this.failoverToNextNode();
    }
  }

  private tripCircuit(): void {
    this.state = 'OPEN';
    this.totalTrips++;
    this.lastTripTimestamp = Date.now();
  }

  private failoverToNextNode(): void {
    // Attempt to select next healthy node
    for (let i = 0; i < this.nodes.length; i++) {
      const nextIdx = (this.activeNodeIndex + 1 + i) % this.nodes.length;
      if (this.nodes[nextIdx].isHealthy || this.nodes[nextIdx].consecutiveFailures < this.config.failureThreshold) {
        this.activeNodeIndex = nextIdx;
        return;
      }
    }
  }

  private checkHalfOpenTransition(): void {
    if (this.state === 'OPEN' && this.lastTripTimestamp) {
      if (Date.now() - this.lastTripTimestamp >= this.config.recoveryTimeMs) {
        this.state = 'HALF_OPEN';
      }
    }
  }

  public async executeWithBreaker<T>(requestFn: (url: string) => Promise<T>): Promise<T> {
    this.checkHalfOpenTransition();
    const endpoint = this.getActiveEndpoint();
    const start = Date.now();

    try {
      const res = await requestFn(endpoint);
      this.recordSuccess(Date.now() - start);
      return res;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }
}

export const circuitBreaker = new CircuitBreakerService();
