export type WebhookEventType =
  | 'TOURNAMENT_CREATED'
  | 'TOURNAMENT_FUNDED'
  | 'TOURNAMENT_SETTLED'
  | 'DISPUTE_RAISED'
  | 'CHAMPION_CROWNED';

export interface WebhookRegistration {
  id: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  isActive: boolean;
  createdAt: number;
}

export interface WebhookPayload {
  eventId: string;
  eventType: WebhookEventType;
  timestamp: number;
  data: Record<string, any>;
}

export interface WebhookDeliveryAttempt {
  id: string;
  webhookId: string;
  eventId: string;
  statusCode?: number;
  success: boolean;
  error?: string;
  attemptedAt: number;
}
