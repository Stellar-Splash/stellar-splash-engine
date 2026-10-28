import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { MetricsService } from '../src/services/metrics.service';
import { createApp } from '../src/app';

describe('MetricsService & Prometheus Endpoint', () => {
  beforeEach(() => {
    MetricsService.reset();
  });

  it('tracks matches and settlements accurately in memory', () => {
    MetricsService.recordMatch('verified');
    MetricsService.recordMatch('verified');
    MetricsService.recordMatch('failed');

    MetricsService.recordSettlement('success', 250);
    MetricsService.recordSettlement('failed', 450);

    const m = MetricsService.getMetrics();
    expect(m.matchesPlayed.verified).toBe(2);
    expect(m.matchesPlayed.failed).toBe(1);
    expect(m.settlements.success).toBe(1);
    expect(m.settlements.failed).toBe(1);
    expect(m.settlementLatencySumMs).toBe(700);
    expect(m.settlementLatencyCount).toBe(2);
  });

  it('generates standard Prometheus exposition formatted strings', () => {
    MetricsService.recordMatch('verified');
    MetricsService.recordSettlement('success', 1200);

    const raw = MetricsService.formatPrometheusMetrics();
    expect(raw).toContain('# HELP splash_matches_total');
    expect(raw).toContain('# TYPE splash_matches_total counter');
    expect(raw).toContain('splash_matches_total{status="verified"} 1');
    expect(raw).toContain('splash_settlements_total{status="success"} 1');
    expect(raw).toContain('process_uptime_seconds');
  });

  it('exposes /api/metrics over HTTP with standard content-type', async () => {
    const app = createApp();
    const res = await request(app).get('/api/metrics');

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/plain');
    expect(res.text).toContain('process_uptime_seconds');
    expect(res.text).toContain('sse_active_clients_total');
  });
});
