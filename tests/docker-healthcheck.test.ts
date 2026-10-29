import { describe, it, expect } from 'vitest';

function parseHealthPayload(jsonString: string): { status: string; isHealthy: boolean } {
  try {
    const data = JSON.parse(jsonString);
    return {
      status: data.status || 'unknown',
      isHealthy: data.status === 'ok',
    };
  } catch {
    return { status: 'error', isHealthy: false };
  }
}

describe('Docker Healthcheck Response Parser', () => {
  it('parses valid ok health check json', () => {
    const raw = JSON.stringify({
      status: 'ok',
      service: 'stellar-splash-engine',
      version: '1.0.0',
      network: 'TESTNET',
      uptimeSeconds: 120,
    });

    const parsed = parseHealthPayload(raw);
    expect(parsed.isHealthy).toBe(true);
    expect(parsed.status).toBe('ok');
  });

  it('flags unparseable or error health payload', () => {
    const parsed = parseHealthPayload('Internal Server Error 500');
    expect(parsed.isHealthy).toBe(false);
    expect(parsed.status).toBe('error');
  });
});
