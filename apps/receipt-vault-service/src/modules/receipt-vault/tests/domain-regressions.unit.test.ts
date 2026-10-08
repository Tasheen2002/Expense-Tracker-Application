import { describe, expect, it, vi } from 'vitest';
import { TagService } from '../application/services/tag.service';
import { IReceiptTagDefinitionRepository } from '../domain/repositories/receipt-tag-definition.repository';
import { randomUUID } from 'node:crypto';
import { Receipt } from '../domain/entities/receipt.entity';
import { ReceiptMetadata } from '../domain/entities/receipt-metadata.entity';
import { ReceiptTagDefinition } from '../domain/entities/receipt-tag-definition.entity';
import { FileInfo } from '../domain/value-objects/file-info';
import { StorageLocation } from '../domain/value-objects/storage-location';
import { StorageProvider } from '../domain/enums/storage-provider';
import { ReceiptStatus, canTransitionTo } from '../domain/enums/receipt-status';
import { ReceiptType } from '../domain/enums/receipt-type';
import { ReceiptId } from '../domain/value-objects/receipt-id';
import { MetadataId } from '../domain/value-objects/metadata-id';
import { TagId } from '../domain/value-objects/tag-id';
import { addMetadataSchema } from '../infrastructure/http/validation/metadata.schema';
import { ReceiptValidationError, ReceiptNotFoundError, DuplicateReceiptError } from '../domain/errors/receipt.errors';
import { ReceiptAuditEvent, eventSnapshots } from '../domain/entities/receipt-validation';
import { DomainEvent } from '@core/domain/events/domain-event';

const workspaceId = randomUUID(), userId = randomUUID();
const file = { fileName: 'receipt.pdf', originalName: 'receipt.pdf', filePath: 'receipt.pdf', fileSize: 20, mimeType: 'application/pdf' };
const make = () => Receipt.create({ ...file, workspaceId, userId, storageLocation: StorageLocation.createLocal('receipt.pdf') });
describe('Receipt domain regression coverage', () => {
  it.each([
    { thumbnailPath: '  ' }, { thumbnailPath: 'x'.repeat(1001) },
    { failureReason: '  ' }, { failureReason: 'x'.repeat(5001) },
    { ocrText: 42 as unknown as string },
    { processedAt: new Date('invalid') }, { deletedAt: null as unknown as Date },
  ])('rejects invalid persisted optional receipt fields: %s', overrides => {
    expect(() => Receipt.fromPersistence({
      id: ReceiptId.create(), workspaceId, userId, fileInfo: FileInfo.create(file),
      receiptType: ReceiptType.EXPENSE, status: ReceiptStatus.PENDING,
      storageLocation: StorageLocation.createLocal('receipt.pdf'), createdAt: new Date(), updatedAt: new Date(), ...overrides,
    })).toThrow(ReceiptValidationError);
  });
  it('reconstitutes valid optional fields without producing new events', () => {
    const receipt = Receipt.fromPersistence({
      id: ReceiptId.create(), workspaceId, userId, fileInfo: FileInfo.create(file),
      receiptType: ReceiptType.EXPENSE, status: ReceiptStatus.FAILED,
      storageLocation: StorageLocation.createLocal('receipt.pdf'), createdAt: new Date(), updatedAt: new Date(),
      thumbnailPath: 'preview.png', failureReason: ' failed ', ocrText: '', processedAt: new Date(),
    });
    expect(receipt.failureReason).toBe('failed'); expect(receipt.thumbnailPath).toBe('preview.png');
    expect(receipt.ocrText).toBe(''); expect(receipt.domainEvents).toHaveLength(0);
  });
  it('rejects invalid OCR text before changing status or emitting events', () => {
    const receipt = make(); receipt.startProcessing(); receipt.clearDomainEvents();
    expect(() => receipt.markAsProcessed(42 as unknown as string)).toThrow(ReceiptValidationError);
    expect(receipt.status).toBe(ReceiptStatus.PROCESSING); expect(receipt.domainEvents).toHaveLength(0);
  });
  it('snapshots event identity, serialization and nested payloads without copying concrete prototypes', () => {
    class TestEvent extends DomainEvent {
      readonly eventType = 'TestEvent';
      getPayload() { return { nested: { value: 1 }, absent: undefined }; }
    }
    const original = new TestEvent(randomUUID(), 'Test');
    const snapshot = eventSnapshots([original])[0];
    expect(snapshot).toBeInstanceOf(DomainEvent); expect(snapshot).not.toBeInstanceOf(TestEvent);
    expect(snapshot.toJSON()).toEqual(original.toJSON());
    const payload = snapshot.getPayload() as { nested: { value: number } };
    payload.nested.value = 9; snapshot.occurredAt.setTime(0);
    expect(snapshot.getPayload()).toEqual({ nested: { value: 1 }, absent: undefined });
    expect(original.occurredAt.getTime()).not.toBe(0);
    expect(eventSnapshots([original])[0].toJSON()).toEqual(original.toJSON());
  });
  it('keeps audit names, aggregate types and required payload fields checked by TypeScript', () => {
    const event = new ReceiptAuditEvent(randomUUID(), 'Receipt', 'ReceiptProcessingFailed', { receiptId: randomUUID(), workspaceId, userId, reason: 'failed' });
    expect(event.getPayload()).toMatchObject({ reason: 'failed', workspaceId, userId });
    // These unreachable expressions are compile-time regression checks, exercised by tsc.
    const checkEventTypes = () => {
      // @ts-expect-error Unknown event names are forbidden.
      new ReceiptAuditEvent(randomUUID(), 'Receipt', 'ReceiptVerifed', { receiptId: randomUUID(), workspaceId, userId });
      // @ts-expect-error Failure events require their reason.
      new ReceiptAuditEvent(randomUUID(), 'Receipt', 'ReceiptProcessingFailed', { receiptId: randomUUID(), workspaceId, userId });
      // @ts-expect-error Tag events must use the tag aggregate.
      new ReceiptAuditEvent(randomUUID(), 'Receipt', 'ReceiptTagCreated', { tagId: randomUUID(), workspaceId });
    };
    void checkEventTypes;
  });
  it('treats a whitespace-only tag name change as a no-op', async () => {
    const tag = ReceiptTagDefinition.create({ workspaceId, name: 'Travel' });
    tag.clearDomainEvents();
    const definitions: IReceiptTagDefinitionRepository = {
      save: vi.fn(), findById: vi.fn().mockResolvedValue(tag), findByName: vi.fn().mockResolvedValue(tag),
      findByWorkspace: vi.fn(), exists: vi.fn(), existsByName: vi.fn(), delete: vi.fn(),
    };
    const result = await new TagService(definitions).updateTag(tag.id.getValue(), workspaceId, { name: ' Travel ' }, userId);
    expect(result.name).toBe('Travel');
    expect(definitions.findByName).not.toHaveBeenCalled();
    expect(tag.domainEvents).toHaveLength(0);
  });
  it('rejects an empty receipt type instead of silently defaulting it', () => {
    expect(() => Receipt.create({ ...file, workspaceId, userId, receiptType: '' as ReceiptType, storageLocation: StorageLocation.createLocal('receipt.pdf') })).toThrow();
  });
  it.each([0, '0'])('preserves zero amounts: %s', totalAmount => {
    const metadata = ReceiptMetadata.create({ receiptId: randomUUID(), subtotal: 0, totalAmount, taxAmount: 1, currency: 'usd', transactionDate: new Date('2026-01-01') });
    expect(metadata.totalAmount?.toString()).toBe('0'); expect(metadata.calculateTotal()?.toString()).toBe('1');
    expect(metadata.hasCompleteFinancialInfo()).toBe(true);
    metadata.updateFinancialAmounts({ totalAmount: 0 }); expect(metadata.totalAmount?.toString()).toBe('0');
  });
  it.each([-1, NaN, Infinity, 1.234, 'invalid', '10000000000'])('rejects invalid financial value %s', totalAmount => {
    expect(() => ReceiptMetadata.create({ receiptId: randomUUID(), totalAmount })).toThrow(ReceiptValidationError);
  });
  it('validates all financial changes before mutation', () => {
    const metadata = ReceiptMetadata.create({ receiptId: randomUUID(), subtotal: 5, totalAmount: 5 });
    const before = ReceiptMetadata.toDTO(metadata); metadata.clearDomainEvents();
    expect(() => metadata.updateFinancialAmounts({ subtotal: 99, totalAmount: 'invalid' })).toThrow();
    expect(ReceiptMetadata.toDTO(metadata)).toEqual(before); expect(metadata.domainEvents).toHaveLength(0);
  });
  it('rejects invalid metadata dates, currencies, payment details, text and line items', () => {
    for (const data of [{ transactionDate: new Date('invalid') }, { currency: 'BAD' }, { lastFourDigits: 'abcd' }, { transactionTime: '25:00' }, { merchantName: 'x'.repeat(256) }, { notes: 'x'.repeat(5001) }, { lineItems: [{ description: 'item', quantity: -1, unitPrice: 1, amount: 1 }] }]) {
      expect(() => ReceiptMetadata.create({ receiptId: randomUUID(), ...data })).toThrow();
    }
  });
  it('copies nested inputs, getters, DTOs and dates', () => {
    const items = [{ description: 'item', quantity: 1, unitPrice: 2, amount: 2 }];
    const customFields = { nested: { value: 1 } }; const transactionDate = new Date('2026-01-01');
    const metadata = ReceiptMetadata.create({ receiptId: randomUUID(), lineItems: items, customFields, transactionDate });
    items[0].quantity = -1; customFields.nested.value = 9; transactionDate.setFullYear(1999);
    metadata.lineItems![0].quantity = -2; metadata.transactionDate!.setFullYear(1998);
    ReceiptMetadata.toDTO(metadata).lineItems![0].quantity = -3;
    expect(metadata.lineItems![0].quantity).toBe(1); expect(metadata.customFields).toEqual({ nested: { value: 1 } }); expect(metadata.transactionDate!.getUTCFullYear()).toBe(2026);
  });
  it('rejects non-JSON and dangerous custom fields without losing prior state', () => {
    const metadata = ReceiptMetadata.create({ receiptId: randomUUID(), customFields: { valid: 1 } });
    expect(() => metadata.setCustomField('invalid', NaN)).toThrow(); expect(() => metadata.setCustomField('__proto__', { polluted: true })).toThrow();
    expect(metadata.customFields).toEqual({ valid: 1 });
  });
  it('does not change metadata timestamps or emit events for no-op updates', () => {
    const metadata = ReceiptMetadata.create({ receiptId: randomUUID(), subtotal: 1 });
    metadata.clearDomainEvents(); const timestamp = metadata.updatedAt.getTime();
    metadata.updateFinancialAmounts({}); metadata.updateMerchantInfo({});
    expect(metadata.updatedAt.getTime()).toBe(timestamp); expect(metadata.domainEvents).toHaveLength(0);
  });
  it.each([NaN, Infinity, -1, 1.5])('rejects invalid file size %s', fileSize => expect(() => FileInfo.create({ ...file, fileSize })).toThrow());
  it('copies file and storage inputs and rejects invalid hash/path/provider/key', () => {
    const props = { ...file }; const info = FileInfo.create(props); props.fileSize = -1; expect(info.getFileSize()).toBe(20);
    expect(() => FileInfo.create({ ...file, fileHash: 'invalid' })).toThrow(); expect(() => FileInfo.create({ ...file, filePath: 'x'.repeat(1001) })).toThrow();
    expect(() => StorageLocation.create({ provider: 'UNKNOWN' as StorageProvider, key: 'key', bucket: 'bucket' })).toThrow();
    expect(() => StorageLocation.createLocal('')).toThrow(); expect(() => StorageLocation.createS3('', 'key')).toThrow();
    const storageProps = { provider: StorageProvider.LOCAL, key: 'key.pdf', bucket: 'local' }; const location = StorageLocation.create(storageProps); storageProps.key = '../other'; expect(location.getKey()).toBe('key.pdf');
  });
  it('validates receipt ownership IDs, expense IDs and enum membership', () => {
    expect(() => Receipt.create({ ...file, workspaceId: 'invalid', userId, storageLocation: StorageLocation.createLocal('receipt.pdf') })).toThrow();
    expect(() => Receipt.create({ ...file, workspaceId, userId, receiptType: 'UNKNOWN' as ReceiptType, storageLocation: StorageLocation.createLocal('receipt.pdf') })).toThrow();
    expect(() => make().linkToExpense('invalid')).toThrow();
  });
  it('blocks mutations on deleted receipts and permits explicit restore', () => {
    const receipt = make(); receipt.linkToExpense(randomUUID()); receipt.softDelete(); receipt.clearDomainEvents();
    for (const operation of [() => receipt.startProcessing(), () => receipt.reject(), () => receipt.unlinkFromExpense(), () => receipt.setThumbnailPath('thumbnail.png')]) expect(operation).toThrow();
    expect(receipt.canBeReprocessed()).toBe(false); expect(receipt.domainEvents).toHaveLength(0);
    receipt.restore(); expect(receipt.isDeleted()).toBe(false); expect(receipt.domainEvents[0].eventType).toBe('ReceiptRestored');
  });
  it.each([NaN, Infinity, -1, 101, 1.234])('rejects invalid confidence %s before changing state', confidence => {
    const receipt = make(); receipt.startProcessing(); const timestamp = receipt.updatedAt.getTime();
    expect(() => receipt.markAsProcessed('text', confidence)).toThrow(); expect(receipt.status).toBe(ReceiptStatus.PROCESSING); expect(receipt.updatedAt.getTime()).toBe(timestamp);
  });
  it('clears failure and old OCR during retries and emits a consistent result', () => {
    const receipt = make(); receipt.startProcessing(); receipt.markAsFailed('failure'); receipt.startProcessing(); receipt.markAsProcessed('old', 90); receipt.startProcessing(); receipt.markAsProcessed();
    expect(receipt.failureReason).toBeUndefined(); expect(receipt.ocrText).toBeUndefined(); expect(receipt.ocrConfidence).toBeUndefined();
    expect(receipt.domainEvents.at(-1)?.getPayload()).toMatchObject({ workspaceId, userId, ocrText: undefined, ocrConfidence: undefined });
  });
  it('returns defensive event queue/timestamp snapshots and emits unlink/verify audit events', () => {
    const receipt = make(); const original = receipt.createdAt.getTime(); receipt.createdAt.setTime(0); expect(receipt.createdAt.getTime()).toBe(original);
    const events = receipt.domainEvents; events[0].occurredAt.setTime(0); events.pop(); expect(receipt.domainEvents).toHaveLength(1); expect(receipt.domainEvents[0].occurredAt.getTime()).not.toBe(0);
    receipt.linkToExpense(randomUUID()); receipt.unlinkFromExpense(); receipt.startProcessing(); receipt.markAsProcessed(); receipt.verify();
    expect(receipt.domainEvents.map(event => event.eventType)).toEqual(expect.arrayContaining(['ReceiptUnlinkedFromExpense', 'ReceiptVerified']));
  });
  it('validates tag updates atomically, normalizes empty color and avoids no-op events', () => {
    const tag = ReceiptTagDefinition.create({ workspaceId, name: 'tag', color: '#aabbcc' }); tag.clearDomainEvents();
    expect(() => tag.updateDetails({ name: 'changed', color: 'invalid' })).toThrow(); expect(tag.name).toBe('tag');
    tag.updateName(' tag '); expect(tag.domainEvents).toHaveLength(0); tag.updateColor(''); expect(tag.color).toBeUndefined();
    tag.createdAt.setFullYear(1999); expect(tag.createdAt.getFullYear()).not.toBe(1999);
  });
  it('rejects malformed HTTP amount/date inputs while accepting legitimate zero and dates', () => {
    for (const value of [{ totalAmount: '1abc' }, { totalAmount: Infinity }, { totalAmount: 1.234 }, { transactionDate: '2026-02-30' }, { transactionDate: 'invalid' }]) expect(addMetadataSchema.safeParse(value).success).toBe(false);
    expect(addMetadataSchema.safeParse({ totalAmount: 0, transactionDate: '2026-01-01' }).success).toBe(true);
  });
  it.each([ReceiptId, MetadataId, TagId])('validates, canonicalizes and protects %s IDs', ID => {
    const id = ID.create(); expect(id.equals(ID.fromString(id.getValue().toUpperCase()))).toBe(true); expect(() => ID.fromString('invalid')).toThrow(); expect(Object.isFrozen(id)).toBe(true);
  });
  it('preserves domain error codes and statuses', () => {
    expect(new ReceiptNotFoundError('id')).toMatchObject({ code: 'RECEIPT_NOT_FOUND', statusCode: 404 }); expect(new DuplicateReceiptError('hash')).toMatchObject({ code: 'DUPLICATE_RECEIPT', statusCode: 409 });
  });
  it.each(Object.values(ReceiptStatus).flatMap(from => Object.values(ReceiptStatus).map(to => [from, to] as const)))('enforces transition %s -> %s', (from, to) => {
    const receipt = Receipt.fromPersistence({ id: ReceiptId.create(), workspaceId, userId, fileInfo: FileInfo.create(file), receiptType: ReceiptType.EXPENSE, status: from, storageLocation: StorageLocation.createLocal('receipt.pdf'), createdAt: new Date(), updatedAt: new Date() });
    const operations = { PROCESSING: () => receipt.startProcessing(), PROCESSED: () => receipt.markAsProcessed(), FAILED: () => receipt.markAsFailed('failed'), VERIFIED: () => receipt.verify(), REJECTED: () => receipt.reject(), PENDING: () => { throw new Error('No reset transition'); } };
    if (canTransitionTo(from, to)) { operations[to](); expect(receipt.status).toBe(to); } else expect(operations[to]).toThrow();
  });
});
