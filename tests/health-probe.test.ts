import { describe, it, expect, beforeEach } from 'vitest';
import { HealthProbeService } from '../src/services/health-probe.service';

describe('HealthProbeService', () => {
  beforeEach(() => {
    HealthProbeService.setReady(true);
    HealthProbeService.setHorizonReachable(true);
  });

  it('reports healthy liveness probe with status UP and 200', () => {
    const liveness = HealthProbeService.checkLiveness();
    expect(liveness.status).toBe('UP');
    expect(liveness.statusCode).toBe(200);
    expect(liveness.checks.find((c) => c.name === 'process')?.status).toBe('UP');
    expect(liveness.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('reports healthy readiness probe by default', () => {
    const readiness = HealthProbeService.checkReadiness();
    expect(readiness.status).toBe('UP');
    expect(readiness.statusCode).toBe(200);
    expect(readiness.checks.length).toBe(2);
  });

  it('returns status DOWN and 503 when readiness is toggled off', () => {
    HealthProbeService.setReady(false);

    const readiness = HealthProbeService.checkReadiness();
    expect(readiness.status).toBe('DOWN');
    expect(readiness.statusCode).toBe(503);
    expect(readiness.checks.find((c) => c.name === 'engine_state')?.status).toBe('DOWN');
  });

  it('returns status DOWN and 503 when Horizon is unreachable', () => {
    HealthProbeService.setHorizonReachable(false);

    const readiness = HealthProbeService.checkReadiness();
    expect(readiness.status).toBe('DOWN');
    expect(readiness.statusCode).toBe(503);
    expect(readiness.checks.find((c) => c.name === 'horizon_connectivity')?.status).toBe('DOWN');
  });
});
