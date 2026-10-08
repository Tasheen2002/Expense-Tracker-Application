import { describe, expect, it, vi } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { Receipt } from '../domain/entities/receipt.entity';
import { ReceiptStatus } from '../domain/enums/receipt-status';
import { StorageLocation } from '../domain/value-objects/storage-location';
import { ReceiptRepositoryImpl } from '../infrastructure/persistence/receipt.repository.impl';
import { ReceiptMetadataRepositoryImpl } from '../infrastructure/persistence/receipt-metadata.repository.impl';
import { ReceiptTagDefinitionRepositoryImpl } from '../infrastructure/persistence/receipt-tag-definition.repository.impl';
import { ReceiptMetadata } from '../domain/entities/receipt-metadata.entity';
import { ReceiptTagDefinition } from '../domain/entities/receipt-tag-definition.entity';

const workspaceId = randomUUID(),
  userId = randomUUID();
const make = () =>
  Receipt.create({
    workspaceId,
    userId,
    fileName: 'receipt.pdf',
    originalName: 'receipt.pdf',
    filePath: 'receipt.pdf',
    fileSize: 20,
    mimeType: 'application/pdf',
    storageLocation: StorageLocation.createLocal('receipt.pdf'),
  });
function persisted() {
  const receipt = make();
  return Receipt.fromPersistence({
    id: receipt.id,
    workspaceId,
    userId,
    fileInfo: receipt.fileInfo,
    storageLocation: receipt.storageLocation,
    receiptType: receipt.receiptType,
    status: ReceiptStatus.PENDING,
    createdAt: receipt.createdAt,
    updatedAt: receipt.updatedAt,
    version: 3,
  });
}
function fixture() {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    receipt: {
      create: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findFirst: vi.fn().mockResolvedValue({ workspaceId, userId }),
    },
    receiptMetadata: {
      create: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    receiptTagDefinition: {
      create: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    outboxEvent: { create: vi.fn() },
  };
  // Adapter doubles implement only the operations exercised by these transaction contract tests.
  const prisma = {
    $transaction: vi.fn(
      async (write: (transaction: typeof tx) => Promise<unknown>) => write(tx)
    ),
  } as unknown as PrismaClient;
  return { tx, prisma };
}
const unique = (target: string[]) =>
  new Prisma.PrismaClientKnownRequestError('duplicate', {
    code: 'P2002',
    clientVersion: '5.22.0',
    meta: { target },
  });

describe('Persistence contracts supporting application use cases', () => {
  it('uses create once, then a version-checked update without upsert', async () => {
    const { tx, prisma } = fixture();
    const receipt = make();
    const repo = new ReceiptRepositoryImpl(prisma);
    await repo.save(receipt);
    expect(receipt.expectedVersion).toBe(0);
    expect(tx.receipt.create).toHaveBeenCalledOnce();
    receipt.linkToExpense(randomUUID());
    await repo.save(receipt);
    expect(tx.receipt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: receipt.id.getValue(), workspaceId, version: 0 },
        data: expect.objectContaining({ version: { increment: 1 } }),
      })
    );
    expect(receipt.expectedVersion).toBe(1);
    expect(tx.receipt.create).toHaveBeenCalledOnce();
  });
  it('rejects a stale or deleted row without creating it or publishing events', async () => {
    const { tx, prisma } = fixture();
    tx.receipt.updateMany.mockResolvedValue({ count: 0 });
    const receipt = persisted();
    receipt.softDelete();
    await expect(
      new ReceiptRepositoryImpl(prisma).save(receipt)
    ).rejects.toMatchObject({
      code: 'RECEIPT_WRITE_CONFLICT',
      statusCode: 409,
    });
    expect(tx.receipt.create).not.toHaveBeenCalled();
    expect(tx.outboxEvent.create).not.toHaveBeenCalled();
    expect(receipt.expectedVersion).toBe(3);
    expect(receipt.domainEvents).toHaveLength(1);
  });
  it('does not acknowledge a write or clear events when outbox insertion fails', async () => {
    const { tx, prisma } = fixture();
    tx.outboxEvent.create.mockRejectedValue(new Error('outbox unavailable'));
    const receipt = persisted();
    receipt.softDelete();
    await expect(
      new ReceiptRepositoryImpl(prisma).save(receipt)
    ).rejects.toThrow('outbox unavailable');
    expect(receipt.expectedVersion).toBe(3);
    expect(receipt.domainEvents).toHaveLength(1);
  });
  it('writes NULL for cleared tag fields', async () => {
    const { tx, prisma } = fixture();
    const tag = ReceiptTagDefinition.create({
      workspaceId,
      name: 'Travel',
      color: '#112233',
      description: 'text',
    });
    const repo = new ReceiptTagDefinitionRepositoryImpl(prisma);
    await repo.save(tag, userId);
    tag.updateDetails({ color: '', description: '' });
    await repo.save(tag, userId);
    expect(tx.receiptTagDefinition.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'Travel',
          color: null,
          description: null,
          version: { increment: 1 },
        },
      })
    );
  });
  it('translates a metadata uniqueness race but does not mislabel outbox ID collisions', async () => {
    const { tx, prisma } = fixture();
    const metadata = ReceiptMetadata.create({
      receiptId: randomUUID(),
      totalAmount: 0,
    });
    tx.receiptMetadata.create.mockRejectedValue(unique(['receipt_id']));
    await expect(
      new ReceiptMetadataRepositoryImpl(prisma).save(metadata, workspaceId)
    ).rejects.toMatchObject({
      code: 'RECEIPT_METADATA_ALREADY_EXISTS',
      statusCode: 409,
    });
    expect(tx.$queryRaw).toHaveBeenCalledOnce();
    expect(metadata.domainEvents).toHaveLength(1);
    tx.receiptMetadata.create.mockResolvedValue(undefined);
    const error = unique(['id']);
    tx.outboxEvent.create.mockRejectedValue(error);
    await expect(
      new ReceiptMetadataRepositoryImpl(prisma).save(metadata, workspaceId)
    ).rejects.toBe(error);
  });
  it('translates tag-name races while preserving unrelated constraint failures', async () => {
    const { tx, prisma } = fixture();
    const tag = ReceiptTagDefinition.create({ workspaceId, name: 'Travel' });
    tx.receiptTagDefinition.create.mockRejectedValue(
      unique(['workspace_id', 'name'])
    );
    await expect(
      new ReceiptTagDefinitionRepositoryImpl(prisma).save(tag, userId)
    ).rejects.toMatchObject({ code: 'DUPLICATE_TAG_NAME', statusCode: 409 });
    const error = unique(['id']);
    tx.receiptTagDefinition.create.mockRejectedValue(error);
    await expect(
      new ReceiptTagDefinitionRepositoryImpl(prisma).save(tag, userId)
    ).rejects.toBe(error);
  });
});
