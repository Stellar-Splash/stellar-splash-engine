import crypto from 'crypto';

export interface WebhookConfig {
  id: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  description?: string;
}

export interface WebhookDeliveryReport {
  webhookId: string;
  deliveryId: string;
  url: string;
  event: string;
  statusCode?: number;
  success: boolean;
  error?: string;
  durationMs: number;
  timestamp: number;
}

export class WebhookService {
  private static webhooks: Map<string, WebhookConfig> = new Map();
  private static deliveryHistory: WebhookDeliveryReport[] = [];
  private static readonly MAX_HISTORY = 100;

  /**
   * Registers a new outgoing webhook endpoint.
   */
  public static registerWebhook(
    config: Omit<WebhookConfig, 'id'> & { id?: string },
  ): WebhookConfig {
    const id = config.id || `wh-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fullConfig: WebhookConfig = {
      ...config,
      id,
    };
    this.webhooks.set(id, fullConfig);
    return fullConfig;
  }

  /**
   * Removes a registered webhook by ID.
   */
  public static removeWebhook(id: string): boolean {
    return this.webhooks.delete(id);
  }

  /**
   * Retrieves all registered webhooks.
   */
  public static getWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  /**
   * Clears all registered webhooks and history.
   */
  public static clear(): void {
    this.webhooks.clear();
    this.deliveryHistory = [];
  }

  /**
   * Computes HMAC-SHA256 signature for payload verification.
   */
  public static generateSignature(payloadString: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  }

  /**
   * Verifies an incoming or dispatched HMAC-SHA256 signature against payload.
   */
  public static verifySignature(
    payloadString: string,
    secret: string,
    receivedSignature: string,
  ): boolean {
    const cleanSignature = receivedSignature.replace(/^sha256=/, '');
    const expected = this.generateSignature(payloadString, secret);
    return crypto.timingSafeEqual(Buffer.from(cleanSignature, 'hex'), Buffer.from(expected, 'hex'));
  }

  /**
   * Dispatches an event to all subscribed active webhooks.
   */
  public static async dispatch(
    event: string,
    data: Record<string, unknown>,
  ): Promise<WebhookDeliveryReport[]> {
    const matchingWebhooks = Array.from(this.webhooks.values()).filter(
      (w) => w.active && (w.events.includes(event) || w.events.includes('*')),
    );

    if (matchingWebhooks.length === 0) {
      return [];
    }

    const payload = {
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      event,
      timestamp: Date.now(),
      data,
    };

    const payloadString = JSON.stringify(payload);
    const reports: WebhookDeliveryReport[] = [];

    for (const hook of matchingWebhooks) {
      const deliveryId = `del-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const signature = this.generateSignature(payloadString, hook.secret);
      const startTime = Date.now();

      try {
        const response = await fetch(hook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-StellarSplash-Event': event,
            'X-StellarSplash-Delivery': deliveryId,
            'X-StellarSplash-Signature': `sha256=${signature}`,
          },
          body: payloadString,
          signal: AbortSignal.timeout(4000),
        });

        const report: WebhookDeliveryReport = {
          webhookId: hook.id,
          deliveryId,
          url: hook.url,
          event,
          statusCode: response.status,
          success: response.ok,
          durationMs: Date.now() - startTime,
          timestamp: Date.now(),
        };
        reports.push(report);
        this.recordDelivery(report);
      } catch (err: any) {
        const report: WebhookDeliveryReport = {
          webhookId: hook.id,
          deliveryId,
          url: hook.url,
          event,
          success: false,
          error: err.message || 'Network request failed',
          durationMs: Date.now() - startTime,
          timestamp: Date.now(),
        };
        reports.push(report);
        this.recordDelivery(report);
      }
    }

    return reports;
  }

  private static recordDelivery(report: WebhookDeliveryReport): void {
    this.deliveryHistory.unshift(report);
    if (this.deliveryHistory.length > this.MAX_HISTORY) {
      this.deliveryHistory.pop();
    }
  }

  public static getDeliveryHistory(): WebhookDeliveryReport[] {
    return [...this.deliveryHistory];
  }
}
