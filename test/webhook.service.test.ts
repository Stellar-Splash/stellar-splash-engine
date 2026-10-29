import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebhookService } from '../src/services/webhook.service';

describe('WebhookService - HMAC-SHA256 Signed Event Dispatcher', () => {
  beforeEach(() => {
    WebhookService.clear();
  });

  afterEach(() => {
    WebhookService.clear();
    vi.restoreAllMocks();
  });

  it('generates and verifies HMAC-SHA256 payload signatures', () => {
    const payload = JSON.stringify({ event: 'TOURNAMENT_SETTLED', tournamentId: '101' });
    const secret = 'super-secret-key-123';

    const signature = WebhookService.generateSignature(payload, secret);
    expect(signature).toHaveLength(64); // SHA-256 hex string

    // Correct signature passes verification
    const isValid = WebhookService.verifySignature(payload, secret, signature);
    expect(isValid).toBe(true);

    // With sha256= prefix
    const isValidPrefix = WebhookService.verifySignature(payload, secret, `sha256=${signature}`);
    expect(isValidPrefix).toBe(true);

    // Tampered payload fails
    const tamperedPayload = JSON.stringify({ event: 'TOURNAMENT_SETTLED', tournamentId: '999' });
    const isTamperedValid = WebhookService.verifySignature(tamperedPayload, secret, signature);
    expect(isTamperedValid).toBe(false);

    // Incorrect secret fails
    const isWrongSecretValid = WebhookService.verifySignature(payload, 'wrong-secret', signature);
    expect(isWrongSecretValid).toBe(false);
  });

  it('registers and removes webhooks by ID', () => {
    const hook = WebhookService.registerWebhook({
      url: 'https://example.com/webhook',
      secret: 'sec-1',
      events: ['TOURNAMENT_FUNDED'],
      active: true,
    });

    expect(hook.id).toBeDefined();
    expect(WebhookService.getWebhooks()).toHaveLength(1);

    const removed = WebhookService.removeWebhook(hook.id);
    expect(removed).toBe(true);
    expect(WebhookService.getWebhooks()).toHaveLength(0);
  });

  it('dispatches payload with HMAC signature headers to subscribed webhooks', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    vi.stubGlobal('fetch', mockFetch);

    WebhookService.registerWebhook({
      url: 'https://discord-bot.stellar/hook',
      secret: 'discord-sec',
      events: ['TOURNAMENT_SETTLED'],
      active: true,
    });

    // Webhook subscribed to different event should not receive this dispatch
    WebhookService.registerWebhook({
      url: 'https://other-service.stellar/hook',
      secret: 'other-sec',
      events: ['UNRELATED_EVENT'],
      active: true,
    });

    const reports = await WebhookService.dispatch('TOURNAMENT_SETTLED', {
      tournamentId: 501,
      prizeAmount: 100000000,
    });

    expect(reports).toHaveLength(1);
    expect(reports[0].success).toBe(true);
    expect(reports[0].statusCode).toBe(200);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [callUrl, callOptions] = mockFetch.mock.calls[0];
    expect(callUrl).toBe('https://discord-bot.stellar/hook');
    expect(callOptions.headers['X-StellarSplash-Event']).toBe('TOURNAMENT_SETTLED');
    expect(callOptions.headers['X-StellarSplash-Signature']).toMatch(/^sha256=[a-f0-9]{64}$/);
  });
});
