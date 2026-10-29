import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Grafana Dashboard Specification', () => {
  const dashboardPath = path.resolve(__dirname, '../docs/grafana-dashboard.json');

  it('contains valid Grafana JSON schema with required top-level attributes', () => {
    expect(fs.existsSync(dashboardPath)).toBe(true);

    const raw = fs.readFileSync(dashboardPath, 'utf-8');
    const dashboard = JSON.parse(raw);

    expect(dashboard.title).toContain('Stellar Splash');
    expect(dashboard.uid).toBe('stellar-splash-telemetry');
    expect(dashboard.schemaVersion).toBeGreaterThanOrEqual(30);
    expect(Array.isArray(dashboard.panels)).toBe(true);
    expect(dashboard.panels.length).toBeGreaterThanOrEqual(5);
  });

  it('maps panels to active Prometheus metric symbols exported by MetricsService', () => {
    const raw = fs.readFileSync(dashboardPath, 'utf-8');
    const dashboard = JSON.parse(raw);

    const panelQueries = dashboard.panels.flatMap((p: any) =>
      p.targets.map((t: any) => t.expr),
    );

    const joinedQueries = panelQueries.join(' ');
    expect(joinedQueries).toContain('sse_active_clients_total');
    expect(joinedQueries).toContain('splash_matches_total');
    expect(joinedQueries).toContain('splash_settlements_total');
    expect(joinedQueries).toContain('splash_settlement_latency_seconds');
    expect(joinedQueries).toContain('http_requests_total');
    expect(joinedQueries).toContain('process_heap_bytes');
  });
});
