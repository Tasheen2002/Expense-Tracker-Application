import { IChannelProvider, SendResult } from './channel-provider.interface';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string; };
  from: string;
}

/** An adapter supplies real transport; this class never treats logging as delivery. */
export interface EmailTransport {
  send(message: { from: string; to: string; subject: string; html: string; idempotencyKey: string }): Promise<SendResult>;
}

export class EmailProvider implements IChannelProvider {
  constructor(private readonly config: EmailConfig, private readonly transport?: EmailTransport) {}

  async send(params: Parameters<IChannelProvider['send']>[0]): Promise<SendResult> {
    if (!params.recipientEmail) return { success: false, error: 'Recipient email is required for email channel' };
    if (!this.transport) return { success: false, error: 'Email transport is not configured' };
    try {
      return await this.transport.send({ from: this.config.from, to: params.recipientEmail,
        subject: params.subject, html: params.content, idempotencyKey: params.idempotencyKey });
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : 'Email transport failed' };
    }
  }
}