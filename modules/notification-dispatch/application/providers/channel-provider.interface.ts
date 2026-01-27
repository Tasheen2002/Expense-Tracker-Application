// Channel Provider Interface - Abstraction for different delivery channels

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IChannelProvider {
  send(params: {
    recipientId: string;
    recipientEmail?: string;
    subject: string;
    content: string;
    data?: Record<string, unknown>;
  }): Promise<SendResult>;
}
