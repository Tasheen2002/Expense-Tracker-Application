import { createHash } from 'node:crypto';
import { IRecoverableEmailProvider } from '../../application/providers/recoverable-email-provider.interface';
import { IChannelProvider, SendResult } from '../../application/providers/channel-provider.interface';

/** Development-only capture transport; Mailpit does not deduplicate sends. */
export class MailpitEmailProvider implements IRecoverableEmailProvider {
  readonly supportsIdempotency = false;
  readonly providerName: string;
  private readonly endpoint: string;

  constructor(url: string, readonly senderEmail: string) {
    if (process.env.NODE_ENV === 'production') throw new Error('Mailpit is disabled in production');
    const base = new URL(url);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash
      || (base.pathname !== '/' && base.pathname !== '')) throw new Error('MAILPIT_URL must be an HTTP origin');
    if (!senderEmail.trim()) throw new Error('Mailpit sender is required');
    this.endpoint = `${base.origin}/api/v1/send`;
    this.providerName = `mailpit:${createHash('sha256').update(base.origin).digest('hex').slice(0, 24)}`;
  }

  async send(message: Parameters<IChannelProvider['send']>[0]): Promise<SendResult> {
    if (process.env.NODE_ENV === 'production') throw new Error('Mailpit is disabled in production');
    if (!message.recipientEmail) return { success: false, error: 'Recipient email is unavailable' };
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ From: { Email: message.senderEmail ?? this.senderEmail },
          To: [{ Email: message.recipientEmail }], Subject: message.subject, HTML: message.content,
          Headers: { 'X-Notification-ID': message.idempotencyKey } }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (response.ok && body && typeof body === 'object' && 'ID' in body && typeof body.ID === 'string' && body.ID) {
        return { success: true, messageId: body.ID };
      }
      return { success: false, error: `Mailpit response ${response.status}`,
        retryable: response.ok || response.status >= 500 || response.status === 429 };
    } catch {
      return { success: false, retryable: true, error: 'Mailpit capture outcome is uncertain' };
    }
  }
}
