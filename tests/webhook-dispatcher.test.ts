import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookDispatcherService } from '../src/services/webhook-dispatcher.service';

describe('WebhookDispatcherService', () => {
  let service: WebhookDispatcherService;

  beforeEach(() => {
    service = new WebhookDispatcherService();
  });

  it('registers and retrieves webhooks', () => {
    const reg = service.registerWebhook('http://listener.test/webhook', ['TOURNAMENT_SETTLED']);
    expect(reg.id).toBeDefined();
    expect(reg.secret).toBeDefined();
    expect(reg.events).toContain('TOURNAMENT_SETTLED');

    const list = service.getWebhooks();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(reg.id);
  });

  it('generates reproducible HMAC-SHA256 signature', () => {
    const secret = 'MY_TEST_SECRET';
    const payload = JSON.stringify({ message: 'hello' });
    const sig1 = service.createSignature(payload, secret);
    const sig2 = service.createSignature(payload, secret);

    expect(sig1).toBe(sig2);
    expect(sig1).toHaveLength(64); // SHA-256 hex
  });

  it('dispatches events only to subscribed webhooks and tracks history', async () => {
    service.registerWebhook('http://listener.test/settled', ['TOURNAMENT_SETTLED'], 'secret_1');
    service.registerWebhook('http://listener.test/created', ['TOURNAMENT_CREATED'], 'secret_2');

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as any);

    try {
      const attempts = await service.dispatchEvent('TOURNAMENT_SETTLED', { tournamentId: 101 });
      expect(attempts).toHaveLength(1);
      expect(attempts[0].success).toBe(true);
      expect(attempts[0].statusCode).toBe(200);

      const history = service.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].eventId).toBeDefined();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
