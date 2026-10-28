import { EventBusService } from './event-bus.service';

export interface MetricsState {
  httpRequests: Record<string, number>;
  matchesPlayed: { verified: number; failed: number };
  settlements: { success: number; failed: number };
  settlementLatencySumMs: number;
  settlementLatencyCount: number;
}

export class MetricsService {
  private static state: MetricsState = {
    httpRequests: {},
    matchesPlayed: { verified: 0, failed: 0 },
    settlements: { success: 0, failed: 0 },
    settlementLatencySumMs: 0,
    settlementLatencyCount: 0,
  };

  public static recordHttpRequest(method: string, path: string, statusCode: number): void {
    // Normalize path to prevent high cardinality: replace IDs with :id
    const normalizedPath = path.replace(/[0-9a-f-]{8,}/gi, ':id').split('?')[0];
    const key = `${method.toUpperCase()}_${normalizedPath}_${statusCode}`;
    this.state.httpRequests[key] = (this.state.httpRequests[key] || 0) + 1;
  }

  public static recordMatch(status: 'verified' | 'failed'): void {
    if (status === 'verified') {
      this.state.matchesPlayed.verified += 1;
    } else {
      this.state.matchesPlayed.failed += 1;
    }
  }

  public static recordSettlement(status: 'success' | 'failed', latencyMs: number): void {
    if (status === 'success') {
      this.state.settlements.success += 1;
    } else {
      this.state.settlements.failed += 1;
    }
    this.state.settlementLatencySumMs += latencyMs;
    this.state.settlementLatencyCount += 1;
  }

  public static reset(): void {
    this.state = {
      httpRequests: {},
      matchesPlayed: { verified: 0, failed: 0 },
      settlements: { success: 0, failed: 0 },
      settlementLatencySumMs: 0,
      settlementLatencyCount: 0,
    };
  }

  public static getMetrics(): MetricsState {
    return { ...this.state };
  }

  public static formatPrometheusMetrics(): string {
    const lines: string[] = [];
    const mem = process.memoryUsage();
    const uptime = Math.floor(process.uptime());

    // 1. Process Metrics
    lines.push('# HELP process_uptime_seconds The process uptime in seconds.');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${uptime}`);

    lines.push('# HELP process_heap_bytes Process heap memory usage.');
    lines.push('# TYPE process_heap_bytes gauge');
    lines.push(`process_heap_bytes ${mem.heapUsed}`);

    // 2. Active SSE clients
    const activeClients = EventBusService.getSubscriberCount();
    lines.push('# HELP sse_active_clients_total Currently connected Server-Sent Event stream clients.');
    lines.push('# TYPE sse_active_clients_total gauge');
    lines.push(`sse_active_clients_total ${activeClients}`);

    // 3. Matches
    lines.push('# HELP splash_matches_total Total gameplay matches processed by verification engine.');
    lines.push('# TYPE splash_matches_total counter');
    lines.push(`splash_matches_total{status="verified"} ${this.state.matchesPlayed.verified}`);
    lines.push(`splash_matches_total{status="failed"} ${this.state.matchesPlayed.failed}`);

    // 4. Settlements
    lines.push('# HELP splash_settlements_total Multi-recipient settlements processed on Stellar.');
    lines.push('# TYPE splash_settlements_total counter');
    lines.push(`splash_settlements_total{status="success"} ${this.state.settlements.success}`);
    lines.push(`splash_settlements_total{status="failed"} ${this.state.settlements.failed}`);

    lines.push('# HELP splash_settlement_latency_seconds Settlement execution latency summary.');
    lines.push('# TYPE splash_settlement_latency_seconds summary');
    const latencySec = this.state.settlementLatencySumMs / 1000;
    lines.push(`splash_settlement_latency_seconds_sum ${latencySec.toFixed(4)}`);
    lines.push(`splash_settlement_latency_seconds_count ${this.state.settlementLatencyCount}`);

    // 5. HTTP requests
    lines.push('# HELP http_requests_total Total HTTP requests handled by method, path, and status code.');
    lines.push('# TYPE http_requests_total counter');
    for (const [key, count] of Object.entries(this.state.httpRequests)) {
      const parts = key.split('_');
      const method = parts[0];
      const status = parts[parts.length - 1];
      const route = parts.slice(1, -1).join('_');
      lines.push(`http_requests_total{method="${method}",path="${route}",status="${status}"} ${count}`);
    }

    return lines.join('\n') + '\n';
  }
}
