import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

describe('Request ID Tracing Middleware', () => {
  const app = createApp();

  it('generates a new UUIDv4 X-Request-Id header when none is provided', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    const reqId = res.headers['x-request-id'];
    expect(reqId).toBeDefined();
    // Validate UUID format: 8-4-4-4-12 hex characters
    expect(reqId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('preserves client-provided X-Request-Id header for distributed request correlation', async () => {
    const customId = 'client-trace-abc-123-xyz';
    const res = await request(app).get('/api/health').set('X-Request-Id', customId);

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe(customId);
  });
});
