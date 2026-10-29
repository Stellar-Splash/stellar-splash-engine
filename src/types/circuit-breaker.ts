export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface RpcNodeEndpoint {
  url: string;
  name: string;
  isHealthy: boolean;
  consecutiveFailures: number;
  lastFailureTimestamp?: number;
  lastLatencyMs: number;
  p95LatencyMs: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // consecutive failures before opening circuit (e.g. 3)
  recoveryTimeMs: number; // time to stay OPEN before HALF_OPEN testing (e.g. 15,000)
  requestTimeoutMs: number;
}

export interface CircuitBreakerStatus {
  state: CircuitState;
  activeEndpoint: string;
  nodes: RpcNodeEndpoint[];
  totalTrips: number;
  lastTripTimestamp?: number;
}
