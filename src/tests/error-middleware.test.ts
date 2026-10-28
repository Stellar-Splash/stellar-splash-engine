import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from '../app';
import { AppError, errorHandler, notFoundHandler } from '../middleware/error.middleware';

describe('Error Middleware', () => {
  it('returns normalized JSON 404 for unmapped endpoints', async () => {
    const app = createApp();
    const res = await request(app).get('/api/unmapped-endpoint-random');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('NOT_FOUND');
    expect(res.body.message).toContain('not found');
    expect(res.body.timestamp).toBeDefined();
  });

  it('handles custom AppError with specified status code and error code', async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.get('/test-error', () => {
      throw new AppError('Unauthorized token', 401, 'UNAUTHORIZED_ACCESS', { reason: 'expired' });
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/test-error');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('UNAUTHORIZED_ACCESS');
    expect(res.body.message).toBe('Unauthorized token');
    expect(res.body.details).toEqual({ reason: 'expired' });
  });

  it('handles malformed JSON body with normalized 400 error', async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/test-json', (req, res) => res.json({ ok: true }));
    testApp.use(errorHandler);

    const res = await request(testApp)
      .post('/test-json')
      .set('Content-Type', 'application/json')
      .send('{ "brokenJson: true '); // deliberately broken

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_JSON_BODY');
  });
});
