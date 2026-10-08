import { FastifyInstance } from 'fastify';
import { HttpWebhookPublisher, OutboxWorker, OutboxEventDTO } from '@expense-tracker/outbox-kit';
import { z } from 'zod';

export function attachReceiptWorker(app: FastifyInstance) {
  const audit = `${(process.env.AUDIT_SERVICE_URL ?? 'http://localhost:3009').replace(/\/+$/, '')}/api/v1/event-outbox/events`;
  const publisher = new HttpWebhookPublisher({
    ReceiptUploaded: [audit], ReceiptProcessed: [audit], ReceiptLinkedToExpense: [audit], ReceiptDeleted: [audit],
    ReceiptUnlinkedFromExpense: [audit], ReceiptProcessingStarted: [audit], ReceiptProcessingFailed: [audit],
    ReceiptVerified: [audit], ReceiptRejected: [audit], ReceiptRestored: [audit], ReceiptThumbnailUpdated: [audit],
    ReceiptMetadataCreated: [audit], ReceiptMetadataUpdated: [audit], ReceiptMetadataDeleted: [audit],
    ReceiptTagCreated: [audit], ReceiptTagUpdated: [audit], ReceiptTagDeleted: [audit], ReceiptTagAssigned: [audit], ReceiptTagRemoved: [audit],
  });
  const worker = new OutboxWorker(app.compositionRoot.outboxEventRepository, {
    async publish(event: OutboxEventDTO, acknowledge?: (url: string) => Promise<void>) {
      if (event.eventType !== 'ReceiptFileDeletionRequested') return publisher.publish(event, acknowledge);
      const payload = z.object({ key: z.string(), bucket: z.literal('local'), provider: z.literal('LOCAL') }).parse(event.payload);
      const references = await app.prisma.receipt.count({ where: {
        storageProvider: 'LOCAL', storageKey: payload.key,
        OR: [{ storageBucket: 'local' }, { storageBucket: null }],
      } });
      if (references === 0) await app.compositionRoot.fileStorageService.delete(payload.key, payload.bucket);
    },
  });
  let cleaning: Promise<void> | undefined;
  const clean = () => {
    if (cleaning) return;
    cleaning = app.compositionRoot.fileStorageService.cleanupUnreferenced(
      async key => (await app.prisma.receipt.count({ where: { storageKey: key, storageProvider: 'LOCAL' } })) > 0,
      new Date(Date.now() - 24 * 60 * 60 * 1000),
    ).then(() => undefined).catch(error => { app.log.error({ err: error }, 'Receipt orphan cleanup failed'); })
      .finally(() => { cleaning = undefined; });
  };
  const timer = setInterval(clean, 60 * 60 * 1000);
  timer.unref();
  app.addHook('onClose', async () => { clearInterval(timer); await worker.stop(); await cleaning; });
  return worker;
}
