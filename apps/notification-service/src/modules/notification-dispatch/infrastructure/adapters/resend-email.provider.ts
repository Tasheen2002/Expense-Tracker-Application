import { IRecoverableEmailProvider } from '../../application/providers/recoverable-email-provider.interface';
import { IChannelProvider, SendResult } from '../../application/providers/channel-provider.interface';
import { createHash } from 'node:crypto';

/** Resend keeps idempotency keys for 24h. The queue uses a shorter 23h window. */
export class ResendEmailProvider implements IRecoverableEmailProvider {
  readonly providerName: string;
  constructor(private readonly apiKey: string, readonly senderEmail: string) {
    if (!apiKey.trim() || !senderEmail.trim()) throw new Error('Resend credentials and sender are required');
    // Keys are scoped to a provider account. Credential changes require explicit
    // reconciliation rather than assuming a new account shares old dedup keys.
    this.providerName = `resend:${createHash('sha256').update(apiKey).digest('hex').slice(0, 24)}`;
  }

  async send(message: Parameters<IChannelProvider['send']>[0]): Promise<SendResult> {
    if (!message.recipientEmail) return { success: false, error: 'Recipient email is unavailable' };
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json',
          'Idempotency-Key': message.idempotencyKey },
        body: JSON.stringify({ from: message.senderEmail ?? this.senderEmail, to: [message.recipientEmail],
          subject: message.subject, html: message.content }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (response.ok && body && typeof body === 'object' && 'id' in body && typeof body.id === 'string' && body.id) {
        return { success: true, messageId: body.id };
      }
      const name = body && typeof body === 'object' && 'name' in body ? body.name : undefined;
      // Never persist raw provider response content or credentials in notifications.
      return { success: false, error: `Email provider response ${response.status}`,
        retryable: response.ok || response.status >= 500 || response.status === 429
          || (response.status === 409 && name === 'concurrent_idempotent_requests') };
    } catch {
      // Timeout/network errors may have happened after acceptance. Reuse the key.
      return { success: false, retryable: true, error: 'Email provider outcome is uncertain' };
    }
  }
}
