import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreakerService } from '../src/services/circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let breaker: CircuitBreakerService;

  beforeEach(() => {
    breaker = new CircuitBreakerService(
      ['http://rpc-node-1.test', 'http://rpc-node-2.test'],
      { failureThreshold: 2, recoveryTimeMs: 100 }
    );
  });

  it('starts in CLOSED state with primary node active', () => {
    const status = breaker.getStatus();
    expect(status.state).toBe('CLOSED');
    expect(status.activeEndpoint).toBe('http://rpc-node-1.test');
    expect(status.totalTrips).toBe(0);
  });

  it('records successful calls and tracks latency', () => {
    breaker.recordSuccess(45);
    const status = breaker.getStatus();
    expect(status.nodes[0].lastLatencyMs).toBe(45);
    expect(status.nodes[0].isHealthy).toBe(true);
    expect(status.nodes[0].consecutiveFailures).toBe(0);
  });

  it('trips circuit to OPEN after reaching failure threshold and fails over', () => {
    breaker.recordFailure();
    expect(breaker.getStatus().state).toBe('CLOSED'); // First failure

    breaker.recordFailure(); // Second failure (threshold = 2)
    const status = breaker.getStatus();
    expect(status.state).toBe('OPEN');
    expect(status.totalTrips).toBe(1);
    expect(status.activeEndpoint).toBe('http://rpc-node-2.test'); // Failed over to node 2
  });

  it('transitions to HALF_OPEN after recovery time and restores to CLOSED on success', async () => {
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getStatus().state).toBe('OPEN');

    // Wait for recovery time (100ms)
    await new Promise((r) => setTimeout(r, 120));

    expect(breaker.getStatus().state).toBe('HALF_OPEN');

    breaker.recordSuccess(30);
    expect(breaker.getStatus().state).toBe('CLOSED');
  });
});
