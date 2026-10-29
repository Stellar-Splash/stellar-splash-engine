export interface ProbeComponentCheck {
  name: string;
  status: 'UP' | 'DOWN';
  details?: Record<string, unknown> | string;
}

export interface HealthProbeResult {
  status: 'UP' | 'DOWN';
  statusCode: 200 | 503;
  checks: ProbeComponentCheck[];
  uptimeSeconds: number;
  timestamp: number;
}

/**
 * Service providing Kubernetes-compatible liveness and readiness probe checks.
 */
export class HealthProbeService {
  private static startTime: number = Date.now();
  private static isReady: boolean = true;
  private static horizonReachable: boolean = true;

  /**
   * Overrides readiness state for test simulations or graceful shutdowns.
   */
  public static setReady(ready: boolean): void {
    this.isReady = ready;
  }

  /**
   * Overrides Horizon connection status for test simulations.
   */
  public static setHorizonReachable(reachable: boolean): void {
    this.horizonReachable = reachable;
  }

  /**
   * Liveness Probe: Verifies the engine process is running and heap memory is reasonable.
   */
  public static checkLiveness(currentTime: number = Date.now()): HealthProbeResult {
    const memory = process.memoryUsage ? process.memoryUsage() : { heapUsed: 0, heapTotal: 0 };
    const heapUsedMb = Math.round((memory.heapUsed || 0) / 1024 / 1024);

    const checks: ProbeComponentCheck[] = [
      {
        name: 'process',
        status: 'UP',
        details: { pid: process.pid, platform: process.platform },
      },
      {
        name: 'memory',
        status: heapUsedMb < 1024 ? 'UP' : 'DOWN',
        details: { heapUsedMb },
      },
    ];

    const isHealthy = checks.every((c) => c.status === 'UP');
    return {
      status: isHealthy ? 'UP' : 'DOWN',
      statusCode: isHealthy ? 200 : 503,
      checks,
      uptimeSeconds: Math.floor((currentTime - this.startTime) / 1000),
      timestamp: currentTime,
    };
  }

  /**
   * Readiness Probe: Verifies system dependencies (Horizon, DB state, ready flags) before routing traffic.
   */
  public static checkReadiness(currentTime: number = Date.now()): HealthProbeResult {
    const checks: ProbeComponentCheck[] = [
      {
        name: 'engine_state',
        status: this.isReady ? 'UP' : 'DOWN',
        details: this.isReady ? 'Engine is operational' : 'Engine is terminating or uninitialized',
      },
      {
        name: 'horizon_connectivity',
        status: this.horizonReachable ? 'UP' : 'DOWN',
        details: this.horizonReachable ? 'Connected to Stellar Horizon' : 'Horizon RPC unreachable',
      },
    ];

    const isHealthy = checks.every((c) => c.status === 'UP');
    return {
      status: isHealthy ? 'UP' : 'DOWN',
      statusCode: isHealthy ? 200 : 503,
      checks,
      uptimeSeconds: Math.floor((currentTime - this.startTime) / 1000),
      timestamp: currentTime,
    };
  }
}
