import crypto from 'crypto';
import {
  WebhookDeliveryAttempt,
  WebhookEventType,
  WebhookPayload,
  WebhookRegistration,
} from '../types/webhook-dispatcher';

export class WebhookDispatcherService {
  private registrations: Map<string, WebhookRegistration> = new Map();
  private deliveryHistory: WebhookDeliveryAttempt[] = [];

  public registerWebhook(url: string, events: WebhookEventType[], secret?: string): WebhookRegistration {
    const id = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const reg: WebhookRegistration = {
      id,
      url,
      events,
      secret: secret || crypto.randomBytes(24).toString('hex'),
      isActive: true,
      createdAt: Date.now(),
    };
    this.registrations.set(id, reg);
    return reg;
  }

  public getWebhooks(): WebhookRegistration[] {
    return Array.from(this.registrations.values());
  }

  public deleteWebhook(id: string): boolean {
    return this.registrations.delete(id);
  }

  public createSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  public async dispatchEvent(eventType: WebhookEventType, data: Record<string, any>): Promise<WebhookDeliveryAttempt[]> {
    const eventId = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload: WebhookPayload = {
      eventId,
      eventType,
      timestamp: Date.now(),
      data,
    };
    const bodyStr = JSON.stringify(payload);
    const attempts: WebhookDeliveryAttempt[] = [];

    for (const webhook of this.registrations.values()) {
      if (!webhook.isActive || !webhook.events.includes(eventType)) continue;

      const signature = this.createSignature(bodyStr, webhook.secret);
      const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      try {
        const res = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Stellar-Splash-Signature': signature,
            'X-Stellar-Splash-Event': eventType,
          },
          body: bodyStr,
        });

        const attempt: WebhookDeliveryAttempt = {
          id: attemptId,
          webhookId: webhook.id,
          eventId,
          statusCode: res.status,
          success: res.ok,
          attemptedAt: Date.now(),
        };
        attempts.push(attempt);
        this.deliveryHistory.push(attempt);
      } catch (err: any) {
        const attempt: WebhookDeliveryAttempt = {
          id: attemptId,
          webhookId: webhook.id,
          eventId,
          success: false,
          error: err?.message || 'Network request failed',
          attemptedAt: Date.now(),
        };
        attempts.push(attempt);
        this.deliveryHistory.push(attempt);
      }
    }

    return attempts;
  }

  public getHistory(limit: number = 50): WebhookDeliveryAttempt[] {
    return this.deliveryHistory.slice(-limit);
  }

  public clear(): void {
    this.registrations.clear();
    this.deliveryHistory = [];
  }
}

export const webhookDispatcher = new WebhookDispatcherService();
