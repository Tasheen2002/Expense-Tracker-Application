// Channel Provider Interface - Abstraction for different delivery channels

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** Safe to retry with the same payload/key; includes unknown network outcomes. */
  retryable?: boolean;
}

export interface IChannelProvider {
  send(params: {
    /** Stable per durable notification. Providers should honor this when supported. */
    idempotencyKey: string;
    recipientId: string;
    recipientEmail?: string;
    senderEmail?: string;
    subject: string;
    content: string;
    data?: Record<string, unknown>;
  }): Promise<SendResult>;
}
