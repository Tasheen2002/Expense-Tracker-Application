import { IEmailDeliveryRepository, DeliveryClaim } from '../ports/email-delivery.repository';
import { IRecoverableEmailProvider } from '../providers/recoverable-email-provider.interface';
import { IRecipientLookup } from '../../domain/repositories/recipient-lookup';

export class EmailDeliveryService {
  constructor(private readonly repository: IEmailDeliveryRepository,
    private readonly provider: IRecoverableEmailProvider, private readonly recipients: IRecipientLookup) {}

  async runBatch(limit = 5): Promise<void> {
    const claims = await this.repository.claim(limit);
    for (const claim of claims) await this.deliver(claim);
  }

  private async deliver(claim: DeliveryClaim): Promise<void> {
    try {
      const loaded = await this.repository.load(claim); if (!loaded) return;
      const notification = loaded.notification;
      if (notification.sentAt) { await this.repository.complete(claim, true); return; }
      let message = loaded.message;
      if (!message) {
        const email = await this.recipients.findEmail(notification.recipientId);
        if (!email) { await this.repository.complete(claim, false, 'Recipient email is unavailable'); return; }
        message = { idempotencyKey: notification.id.getValue(), recipientId: notification.recipientId.getValue(),
          recipientEmail: email, senderEmail: this.provider.senderEmail, subject: notification.title, content: notification.content };
      }
      // Stored message survives changed recipient address, template or sender config.
      message = await this.repository.prepare(claim, message, this.provider.providerName, this.provider.supportsIdempotency ?? true);
      if (!message) return;
      const result = await this.provider.send(message);
      if (result.success) await this.repository.complete(claim, true);
      else if (result.retryable) await this.repository.retry(claim, result.error ?? 'Transient provider failure');
      else await this.repository.complete(claim, false, result.error ?? 'Email delivery rejected');
    } catch {
      // Provider acceptance cannot be rolled back. Keep identity/message and retry
      // with the provider's capability checked by prepare. Non-idempotent prepared
      // attempts enter reconciliation; if this write fails, lease recovery does too.
      await this.repository.retry(claim, 'Delivery processing interrupted; retry with the stored identity');
    }
  }
}
