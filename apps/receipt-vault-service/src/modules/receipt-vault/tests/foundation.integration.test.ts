import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { Receipt } from '../domain/entities/receipt.entity';
import { ReceiptRepositoryImpl } from '../infrastructure/persistence/receipt.repository.impl';
import { PrismaOutboxEventRepository } from '../infrastructure/persistence/outbox-event.repository.impl';
import { StorageLocation } from '../domain/value-objects/storage-location';
import { StorageProvider } from '../domain/enums/storage-provider';
import { ReceiptMetadata } from '../domain/entities/receipt-metadata.entity';
import { ReceiptTagDefinition } from '../domain/entities/receipt-tag-definition.entity';
import { ReceiptMetadataRepositoryImpl } from '../infrastructure/persistence/receipt-metadata.repository.impl';
import { ReceiptTagDefinitionRepositoryImpl } from '../infrastructure/persistence/receipt-tag-definition.repository.impl';
import { ReceiptTagRepositoryImpl } from '../infrastructure/persistence/receipt-tag.repository.impl';

const url = process.env.RECEIPT_TEST_DATABASE_URL;
if (url && !/^\/(?:codex_test_|expense_tracker_receipt_test)/.test(new URL(url).pathname)) throw new Error('Receipt integration tests require a dedicated test database');
describe.skipIf(!url)('PostgreSQL receipt foundation', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const repository = new ReceiptRepositoryImpl(prisma);
  const workspaceId = randomUUID(), userId = randomUUID();
  const makeReceipt = (hash?: string) => Receipt.create({
    workspaceId, userId, fileName: 'fixture.pdf', originalName: 'fixture.pdf', filePath: 'fixture.pdf',
    fileSize: 20, mimeType: 'application/pdf', fileHash: hash,
    storageLocation: StorageLocation.create({ provider: StorageProvider.LOCAL, bucket: 'local', key: randomUUID() + '.pdf' }),
  });
  afterAll(async () => { await prisma.receipt.deleteMany({ where: { workspaceId } }); await prisma.receiptTagDefinition.deleteMany({ where: { workspaceId } }); await prisma.$disconnect(); });
  it('allows only one concurrent update and cannot resurrect a deleted receipt', async () => {
    const receipt = makeReceipt(); await repository.save(receipt);
    const first = (await repository.findById(receipt.id, workspaceId))!;
    const second = (await repository.findById(receipt.id, workspaceId))!;
    first.linkToExpense(randomUUID()); second.softDelete();
    const results = await Promise.allSettled([repository.save(first), repository.save(second)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const failure = results.find(result => result.status === 'rejected');
    expect(failure?.status === 'rejected' && failure.reason).toMatchObject({ code: 'RECEIPT_WRITE_CONFLICT' });
    const stale = (await repository.findById(receipt.id, workspaceId))!;
    await repository.deleteWithDependencies(receipt.id, workspaceId);
    if (stale.isDeleted()) stale.restore();
    stale.setThumbnailPath('preview.png');
    await expect(repository.save(stale)).rejects.toMatchObject({ code: 'RECEIPT_WRITE_CONFLICT' });
    expect(await prisma.receipt.findUnique({ where: { id: receipt.id.getValue() } })).toBeNull();
  });
  it('rolls back both processing events, status and version on outbox failure', async () => {
    const receipt = makeReceipt(); await repository.save(receipt);
    receipt.startProcessing(); receipt.markAsProcessed('text', 90);
    const event = receipt.domainEvents[1];
    await prisma.outboxEvent.create({ data: { id: event.eventId, aggregateId: event.aggregateId, aggregateType: event.aggregateType, eventType: event.eventType, payload: {}, status: 'PENDING' } });
    const before = await prisma.outboxEvent.count({ where: { aggregateId: receipt.id.getValue() } });
    await expect(repository.save(receipt)).rejects.toThrow();
    const row = await prisma.receipt.findUniqueOrThrow({ where: { id: receipt.id.getValue() } });
    expect(row.status).toBe('PENDING'); expect(row.version).toBe(0);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: row.id } })).toBe(before);
    expect(receipt.expectedVersion).toBe(0); expect(receipt.domainEvents).toHaveLength(2);
  });
  it('translates concurrent metadata and tag-name uniqueness conflicts', async () => {
    const receipt = makeReceipt(); await repository.save(receipt);
    const metadataRepo = new ReceiptMetadataRepositoryImpl(prisma);
    const metadataResults = await Promise.allSettled([1, 2].map(() => metadataRepo.save(ReceiptMetadata.create({ receiptId: receipt.id.getValue() }), workspaceId)));
    expect(metadataResults.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const metadataFailure = metadataResults.find(result => result.status === 'rejected');
    expect(metadataFailure?.status === 'rejected' && metadataFailure.reason).toMatchObject({ code: 'RECEIPT_METADATA_ALREADY_EXISTS' });
    const tagRepo = new ReceiptTagDefinitionRepositoryImpl(prisma), name = randomUUID();
    const tagResults = await Promise.allSettled([1, 2].map(() => tagRepo.save(ReceiptTagDefinition.create({ workspaceId, name }), userId)));
    expect(tagResults.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const tagFailure = tagResults.find(result => result.status === 'rejected');
    expect(tagFailure?.status === 'rejected' && tagFailure.reason).toMatchObject({ code: 'DUPLICATE_TAG_NAME' });
  });
  it('rolls back the row when event insertion fails and retains pending entity events', async () => {
    const receipt = makeReceipt();
    const event = receipt.domainEvents[0];
    await prisma.outboxEvent.create({ data: { id: event.eventId, aggregateId: event.aggregateId, aggregateType: event.aggregateType, eventType: event.eventType, payload: {}, status: 'PENDING' } });
    await expect(repository.save(receipt)).rejects.toThrow();
    expect(await prisma.receipt.findUnique({ where: { id: receipt.id.getValue() } })).toBeNull();
    expect(receipt.domainEvents).toHaveLength(1);
    await prisma.outboxEvent.delete({ where: { id: event.eventId } });
    await repository.save(receipt);
    expect(receipt.domainEvents).toHaveLength(0);
    expect((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.eventId } })).payload).toMatchObject({ workspaceId, userId });
  });
  it('enforces duplicate hashes during concurrent writes', async () => {
    const hash = randomUUID().replace(/-/g, '').repeat(2);
    const results = await Promise.allSettled([repository.save(makeReceipt(hash)), repository.save(makeReceipt(hash))]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.receipt.count({ where: { workspaceId, fileHash: hash } })).toBe(1);
  });
  it('rejects cross-workspace tag assignment at the database boundary', async () => {
    const receipt = makeReceipt(); await repository.save(receipt);
    const tag = await prisma.receiptTagDefinition.create({ data: { workspaceId: randomUUID(), name: randomUUID() } });
    try { await expect(prisma.receiptTag.create({ data: { receiptId: receipt.id.getValue(), tagId: tag.id, workspaceId } })).rejects.toThrow(); }
    finally { await prisma.receiptTagDefinition.delete({ where: { id: tag.id } }); }
  });
  it('rejects invalid persisted size, confidence and hash', async () => {
    const receipt = makeReceipt(); await repository.save(receipt);
    for (const data of [{ fileSize: -1 }, { ocrConfidence: 101 }, { fileHash: 'invalid' }]) {
      await expect(prisma.receipt.update({ where: { id: receipt.id.getValue() }, data })).rejects.toThrow();
    }
  });
  it('claims disjoint events and rejects stale worker acknowledgments after lease recovery', async () => {
    const outbox = new PrismaOutboxEventRepository(prisma);
    const [first, second] = await Promise.all([outbox.claimPending(1000), outbox.claimPending(1000)]);
    expect(first.length + second.length).toBeGreaterThan(0);
    expect(first.some(event => second.some(other => event.id === other.id))).toBe(false);
    const event = [...first, ...second][0];
    expect(await outbox.markDelivered(event.id, 'http://audit.test', event.leaseToken)).toBe(true);
    await prisma.outboxEvent.update({ where: { id: event.id }, data: { leaseExpiresAt: new Date(Date.now() - 1000) } });
    expect(await outbox.releaseExpiredLeases()).toBeGreaterThan(0);
    expect(await outbox.markDelivered(event.id, 'http://stale.test', event.leaseToken)).toBe(false);
    expect((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })).deliveredTo).toContain('http://audit.test');
  });
  it('preserves delivery receipts through retry and accepts completion only from the current lease', async () => {
    const outbox = new PrismaOutboxEventRepository(prisma);
    const id = randomUUID(), token = randomUUID();
    await prisma.outboxEvent.create({ data: {
      id, aggregateId: workspaceId, aggregateType: 'ReceiptFixture', eventType: 'ReceiptUploaded',
      payload: { workspaceId }, status: 'PROCESSING', leaseToken: token,
      leaseExpiresAt: new Date(Date.now() + 60_000),
    } });
    try {
      expect(await outbox.incrementRetry(id, 'stale failure', randomUUID())).toBe(false);
      expect(await outbox.renewLease(id, token, 60_000)).toBe(true);
      expect(await outbox.markDelivered(id, 'http://audit.test', token)).toBe(true);
      expect(await outbox.markDelivered(id, 'http://audit.test', token)).toBe(true);
      const started = Date.now();
      expect(await outbox.incrementRetry(id, 'temporary subscriber outage', token)).toBe(true);
      const failed = await prisma.outboxEvent.findUniqueOrThrow({ where: { id } });
      expect(failed).toMatchObject({ status: 'FAILED', retryCount: 1, leaseToken: null, leaseExpiresAt: null,
        deliveredTo: ['http://audit.test'], error: 'temporary subscriber outage' });
      expect(failed.nextAttemptAt?.getTime()).toBeGreaterThanOrEqual(started + 2000);
      expect(await outbox.updateStatus(id, 'PROCESSED', null, token)).toBe(false);
      expect((await outbox.claimFailed(1000, 5)).some(event => event.id === id)).toBe(false);
      await prisma.outboxEvent.update({ where: { id }, data: { nextAttemptAt: new Date(Date.now() - 1000) } });
      const claimed = (await outbox.claimFailed(1000, 5)).find(event => event.id === id);
      if (!claimed?.leaseToken) throw new Error('Retry event was not claimed');
      expect(claimed.leaseToken).not.toBe(token);
      expect(claimed.deliveredTo).toEqual(['http://audit.test']);
      expect(await outbox.renewLease(id, token, 60_000)).toBe(false);
      expect(await outbox.updateStatus(id, 'PROCESSED', null, claimed.leaseToken)).toBe(true);
      const processed = await prisma.outboxEvent.findUniqueOrThrow({ where: { id } });
      expect(processed).toMatchObject({ status: 'PROCESSED', leaseToken: null, leaseExpiresAt: null, error: null });
      expect(processed.processedAt).not.toBeNull();
    } finally { await prisma.outboxEvent.deleteMany({ where: { id } }); }
  });
  it('queues physical cleanup atomically with permanent deletion', async () => {
    const receipt = makeReceipt(); await repository.save(receipt);
    await repository.deleteWithDependencies(receipt.id, workspaceId);
    expect(await prisma.receipt.findUnique({ where: { id: receipt.id.getValue() } })).toBeNull();
    const events = await prisma.outboxEvent.findMany({ where: { aggregateId: receipt.id.getValue() } });
    expect(events.map(event => event.eventType)).toContain('ReceiptFileDeletionRequested');
    expect(events.map(event => event.eventType)).toContain('ReceiptDeleted');
  });
  it('persists metadata zero and atomic contextual audit events', async () => {
    const receipt = makeReceipt(); await repository.save(receipt);
    const metadataRepository = new ReceiptMetadataRepositoryImpl(prisma);
    const metadata = ReceiptMetadata.create({ receiptId: receipt.id.getValue(), totalAmount: 0, currency: 'usd', notes: 'old note' });
    await metadataRepository.save(metadata, workspaceId);
    expect((await prisma.receiptMetadata.findUniqueOrThrow({ where: { id: metadata.id.getValue() } })).totalAmount?.toString()).toBe('0');
    metadata.updateNotes(''); await metadataRepository.save(metadata, workspaceId);
    expect((await prisma.receiptMetadata.findUniqueOrThrow({ where: { id: metadata.id.getValue() } })).notes).toBeNull();
    const events = await prisma.outboxEvent.findMany({ where: { aggregateId: metadata.id.getValue() } });
    expect(events.map(event => event.eventType)).toEqual(expect.arrayContaining(['ReceiptMetadataCreated', 'ReceiptMetadataUpdated']));
    for (const event of events) expect(event.payload).toMatchObject({ workspaceId, userId, receiptId: receipt.id.getValue() });
    const foreignWorkspace = randomUUID();
    expect(await metadataRepository.findByReceiptId(receipt.id, foreignWorkspace)).toBeNull();
    await expect(metadataRepository.save(metadata, foreignWorkspace)).rejects.toThrow();
    await expect(metadataRepository.delete(metadata.id, foreignWorkspace)).rejects.toThrow();
    await metadataRepository.delete(metadata.id, workspaceId);
    expect((await prisma.outboxEvent.findFirst({ where: { aggregateId: metadata.id.getValue(), eventType: 'ReceiptMetadataDeleted' } }))?.payload).toMatchObject({ workspaceId, userId });
  });
  it('rolls back metadata mutation when its event cannot be persisted', async () => {
    const receipt = makeReceipt(); await repository.save(receipt);
    const metadata = ReceiptMetadata.create({ receiptId: receipt.id.getValue(), totalAmount: 1 });
    const event = metadata.domainEvents[0];
    await prisma.outboxEvent.create({ data: { id: event.eventId, aggregateId: event.aggregateId, aggregateType: event.aggregateType, eventType: event.eventType, payload: {}, status: 'PENDING' } });
    await expect(new ReceiptMetadataRepositoryImpl(prisma).save(metadata, workspaceId)).rejects.toThrow();
    expect(await prisma.receiptMetadata.findUnique({ where: { id: metadata.id.getValue() } })).toBeNull(); expect(metadata.domainEvents).toHaveLength(1);
    await prisma.outboxEvent.delete({ where: { id: event.eventId } });
  });
  it('scopes tag writes and deletes and commits definition/assignment audit events', async () => {
    const receipt = makeReceipt(); await repository.save(receipt);
    const definitions = new ReceiptTagDefinitionRepositoryImpl(prisma), relationships = new ReceiptTagRepositoryImpl(prisma);
    const tag = ReceiptTagDefinition.create({ workspaceId, name: randomUUID(), color: '#FFFFFF' });
    await definitions.save(tag, userId); tag.updateColor(''); await definitions.save(tag, userId);
    expect((await prisma.receiptTagDefinition.findUniqueOrThrow({ where: { id: tag.id.getValue() } })).color).toBeNull();
    await relationships.addTag(receipt.id, tag.id, workspaceId); await relationships.addTag(receipt.id, tag.id, workspaceId);
    expect(await relationships.hasTag(receipt.id, tag.id, randomUUID())).toBe(false);
    await expect(relationships.removeTag(receipt.id, tag.id, randomUUID())).rejects.toThrow();
    await expect(definitions.delete(tag.id, randomUUID(), userId)).rejects.toThrow();
    expect(await relationships.hasTag(receipt.id, tag.id, workspaceId)).toBe(true);
    await relationships.removeTag(receipt.id, tag.id, workspaceId); await relationships.removeTag(receipt.id, tag.id, workspaceId);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: receipt.id.getValue(), eventType: 'ReceiptTagAssigned' } })).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: receipt.id.getValue(), eventType: 'ReceiptTagRemoved' } })).toBe(1);
    await definitions.delete(tag.id, workspaceId, userId);
    expect((await prisma.outboxEvent.findFirst({ where: { aggregateId: tag.id.getValue(), eventType: 'ReceiptTagDeleted' } }))?.payload).toMatchObject({ workspaceId, userId });
  });
  it('persists cleared expense links, restored deletion state and fresh OCR retry state', async () => {
    const receipt = makeReceipt(); receipt.linkToExpense(randomUUID()); receipt.startProcessing(); receipt.markAsProcessed('old OCR', 90); await repository.save(receipt);
    receipt.unlinkFromExpense(); receipt.startProcessing(); await repository.save(receipt);
    const row = await prisma.receipt.findUniqueOrThrow({ where: { id: receipt.id.getValue() } });
    expect(row.expenseId).toBeNull(); expect(row.ocrText).toBeNull(); expect(row.ocrConfidence).toBeNull(); expect(row.processedAt).toBeNull();
    receipt.softDelete(); await repository.save(receipt); receipt.restore(); await repository.save(receipt);
    expect((await prisma.receipt.findUniqueOrThrow({ where: { id: receipt.id.getValue() } })).deletedAt).toBeNull();
    const restored = await prisma.outboxEvent.findFirstOrThrow({ where: { aggregateId: receipt.id.getValue(), eventType: 'ReceiptRestored' } });
    expect(restored.payload).toMatchObject({ workspaceId, userId });
  });
});
