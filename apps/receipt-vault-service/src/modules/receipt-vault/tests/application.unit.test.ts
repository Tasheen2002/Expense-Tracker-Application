import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { ReceiptService } from '../application/services/receipt.service';
import { TagService } from '../application/services/tag.service';
import * as Commands from '../application/commands';
import * as Queries from '../application/queries';
import { Receipt } from '../domain/entities/receipt.entity';
import { ReceiptMetadata } from '../domain/entities/receipt-metadata.entity';
import { ReceiptTagDefinition } from '../domain/entities/receipt-tag-definition.entity';
import { StorageLocation } from '../domain/value-objects/storage-location';
import { IReceiptRepository } from '../domain/repositories/receipt.repository';
import { IReceiptMetadataRepository } from '../domain/repositories/receipt-metadata.repository';
import { IReceiptTagRepository } from '../domain/repositories/receipt-tag.repository';
import { IReceiptTagDefinitionRepository } from '../domain/repositories/receipt-tag-definition.repository';
import { IFileStorageService } from '../domain/ports/file-storage.port';
import {
  processReceiptSchema,
  receiptStatsResponseSchema,
} from '../infrastructure/http/validation/receipt.schema';
import { updateTagSchema } from '../infrastructure/http/validation/tag.schema';

function fixture() {
  const workspaceId = randomUUID(),
    userId = randomUUID(),
    expenseId = randomUUID();
  const receipt = Receipt.create({
    workspaceId,
    userId,
    fileName: 'receipt.pdf',
    originalName: 'receipt.pdf',
    filePath: 'receipt.pdf',
    fileSize: 20,
    mimeType: 'application/pdf',
    storageLocation: StorageLocation.createLocal('receipt.pdf'),
  });
  receipt.clearDomainEvents();
  const metadata = ReceiptMetadata.create({
    receiptId: receipt.id.getValue(),
    merchantName: 'old',
    paymentMethod: 'cash',
    lastFourDigits: '1234',
    invoiceNumber: 'old',
    poNumber: 'old-po',
  });
  metadata.clearDomainEvents();
  const tag = ReceiptTagDefinition.create({ workspaceId, name: 'Travel' });
  const page = {
    items: [receipt],
    total: 1,
    limit: 50,
    offset: 0,
    hasMore: false,
  };
  const receipts = {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(receipt),
    findByWorkspace: vi.fn().mockResolvedValue(page),
    findByExpenseId: vi.fn().mockResolvedValue(page),
    findByUserId: vi.fn().mockResolvedValue(page),
    findByFilters: vi.fn().mockResolvedValue(page),
    countByFilters: vi.fn(),
    findByFileHash: vi.fn().mockResolvedValue(null),
    findPendingReceipts: vi.fn(),
    findFailedReceipts: vi.fn(),
    exists: vi.fn(),
    countByWorkspace: vi.fn(),
    countByStatus: vi.fn(),
    getStatusCounts: vi.fn().mockResolvedValue({ PENDING: 1, REJECTED: 2 }),
    deleteWithDependencies: vi.fn(),
  } satisfies IReceiptRepository;
  const metadatas = {
    save: vi.fn(),
    findById: vi.fn(),
    findByReceiptId: vi.fn().mockResolvedValue(metadata),
    delete: vi.fn(),
    deleteByReceiptId: vi.fn(),
    exists: vi.fn(),
  } satisfies IReceiptMetadataRepository;
  const tags = {
    addTag: vi.fn(),
    removeTag: vi.fn(),
    findTagsByReceipt: vi.fn(),
    removeAllTagsFromReceipt: vi.fn(),
    hasTag: vi.fn().mockResolvedValue(false),
  } satisfies IReceiptTagRepository;
  const definitions = {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(tag),
    findByName: vi.fn().mockResolvedValue(null),
    findByWorkspace: vi.fn().mockResolvedValue({ ...page, items: [tag] }),
    exists: vi.fn().mockResolvedValue(true),
    existsByName: vi.fn(),
    delete: vi.fn(),
  } satisfies IReceiptTagDefinitionRepository;
  const storage = {
    upload: vi
      .fn()
      .mockResolvedValue({ storageKey: 'new.pdf', storageBucket: 'local' }),
    download: vi.fn().mockResolvedValue(Buffer.from('bytes')),
    delete: vi.fn(),
  } satisfies IFileStorageService;
  const references = { assertInWorkspace: vi.fn() };
  const service = new ReceiptService(
    receipts,
    metadatas,
    tags,
    storage,
    references
  );
  const tagService = new TagService(definitions);
  const input = { receiptId: receipt.id.getValue(), workspaceId, userId };
  return {
    service,
    tagService,
    input,
    expenseId,
    receipt,
    metadata,
    tag,
    receipts,
    metadatas,
    tags,
    definitions,
    storage,
    references,
  };
}
type Fixture = ReturnType<typeof fixture>;

describe('Application commands', () => {
  const cases: [string, (f: Fixture) => Promise<unknown>][] = [
    [
      'upload',
      (f) =>
        new Commands.UploadReceiptHandler(f.service).handle({
          ...f.input,
          originalName: 'receipt.pdf',
          mimeType: 'application/pdf',
          fileContent: Buffer.from('%PDF-1.7').toString('base64'),
        }),
    ],
    [
      'link',
      (f) =>
        new Commands.LinkReceiptToExpenseHandler(f.service).handle({
          ...f.input,
          expenseId: f.expenseId,
          authToken: 'Bearer fixture',
        }),
    ],
    [
      'unlink',
      (f) => {
        f.receipt.linkToExpense(f.expenseId);
        return new Commands.UnlinkReceiptFromExpenseHandler(f.service).handle(
          f.input
        );
      },
    ],
    [
      'process',
      (f) =>
        new Commands.ProcessReceiptHandler(f.service).handle({
          ...f.input,
          ocrText: 'text',
          ocrConfidence: 90,
        }),
    ],
    [
      'verify',
      (f) => {
        f.receipt.startProcessing();
        f.receipt.markAsProcessed();
        return new Commands.VerifyReceiptHandler(f.service).handle(f.input);
      },
    ],
    [
      'reject',
      (f) =>
        new Commands.RejectReceiptHandler(f.service).handle({
          ...f.input,
          reason: 'rejected',
        }),
    ],
    [
      'delete',
      (f) =>
        new Commands.DeleteReceiptHandler(f.service).handle({
          ...f.input,
          permanent: true,
        }),
    ],
    [
      'add metadata',
      (f) => {
        f.metadatas.findByReceiptId.mockResolvedValue(null);
        return new Commands.AddReceiptMetadataHandler(f.service).handle({
          ...f.input,
          invoiceNumber: 'new',
        });
      },
    ],
    [
      'update metadata',
      (f) =>
        new Commands.UpdateReceiptMetadataHandler(f.service).handle({
          ...f.input,
          invoiceNumber: 'new',
        }),
    ],
    [
      'assign tag',
      (f) =>
        new Commands.AddReceiptTagHandler(f.service).handle({
          ...f.input,
          tagId: f.tag.id.getValue(),
        }),
    ],
    [
      'remove tag',
      (f) =>
        new Commands.RemoveReceiptTagHandler(f.service).handle({
          ...f.input,
          tagId: f.tag.id.getValue(),
        }),
    ],
    [
      'create tag',
      (f) =>
        new Commands.CreateTagHandler(f.tagService).handle({
          ...f.input,
          name: 'new',
        }),
    ],
    [
      'update tag',
      (f) =>
        new Commands.UpdateTagHandler(f.tagService).handle({
          ...f.input,
          tagId: f.tag.id.getValue(),
          name: 'new',
        }),
    ],
    [
      'delete tag',
      (f) =>
        new Commands.DeleteTagHandler(f.tagService).handle({
          ...f.input,
          tagId: f.tag.id.getValue(),
        }),
    ],
  ];
  it.each(cases)('%s follows its complete use case', async (name, execute) => {
    const f = fixture();
    const result = await execute(f);
    expect(result).toMatchObject({ success: true });
    const checks: Record<string, () => void> = {
      upload: () => expect(f.storage.upload).toHaveBeenCalledOnce(),
      link: () => expect(f.receipt.expenseId).toBe(f.expenseId),
      unlink: () => expect(f.receipt.expenseId).toBeUndefined(),
      process: () => expect(f.receipt.status).toBe('PROCESSED'),
      verify: () => expect(f.receipt.status).toBe('VERIFIED'),
      reject: () => expect(f.receipt.status).toBe('REJECTED'),
      delete: () =>
        expect(f.receipts.deleteWithDependencies).toHaveBeenCalledWith(
          f.receipt.id,
          f.input.workspaceId
        ),
      'add metadata': () =>
        expect(f.metadatas.save.mock.calls[0][0].invoiceNumber).toBe('new'),
      'update metadata': () => expect(f.metadata.invoiceNumber).toBe('new'),
      'assign tag': () =>
        expect(f.tags.addTag).toHaveBeenCalledWith(
          f.receipt.id,
          f.tag.id,
          f.input.workspaceId
        ),
      'remove tag': () =>
        expect(f.tags.removeTag).toHaveBeenCalledWith(
          f.receipt.id,
          f.tag.id,
          f.input.workspaceId
        ),
      'create tag': () =>
        expect(f.definitions.save.mock.calls[0][0].name).toBe('new'),
      'update tag': () => expect(f.tag.name).toBe('new'),
      'delete tag': () =>
        expect(f.definitions.delete).toHaveBeenCalledWith(
          f.tag.id,
          f.input.workspaceId,
          f.input.userId
        ),
    };
    checks[name]();
    const calls = [
      ...f.receipts.findById.mock.calls,
      ...f.metadatas.findByReceiptId.mock.calls,
      ...f.definitions.findById.mock.calls,
    ];
    for (const call of calls) expect(call[1]).toBe(f.input.workspaceId);
    for (const call of f.definitions.save.mock.calls)
      expect(call[1]).toBe(f.input.userId);
  });
  it('passes the authenticated actor and token to Expense verification', async () => {
    const f = fixture();
    await new Commands.LinkReceiptToExpenseHandler(f.service).handle({
      ...f.input,
      expenseId: f.expenseId,
      authToken: 'Bearer fixture',
    });
    expect(f.references.assertInWorkspace).toHaveBeenCalledWith(
      f.expenseId,
      f.input.workspaceId,
      f.input.userId,
      'Bearer fixture'
    );
    expect(f.receipts.save).toHaveBeenCalledOnce();
  });
  it('does not save when Expense verification fails', async () => {
    const f = fixture();
    f.references.assertInWorkspace.mockRejectedValue(new Error('unavailable'));
    await expect(
      f.service.linkToExpense(
        f.input.receiptId,
        f.expenseId,
        f.input.workspaceId,
        f.input.userId
      )
    ).rejects.toThrow('unavailable');
    expect(f.receipts.save).not.toHaveBeenCalled();
  });
  it('updates every accepted metadata field in one domain change', async () => {
    const f = fixture();
    const result = await new Commands.UpdateReceiptMetadataHandler(
      f.service
    ).handle({
      ...f.input,
      merchantName: 'new',
      paymentMethod: 'card',
      lastFourDigits: '9999',
      invoiceNumber: 'new',
      poNumber: 'new-po',
      totalAmount: 0,
      notes: 'note',
    });
    expect(result.data).toMatchObject({
      merchantName: 'new',
      paymentMethod: 'card',
      lastFourDigits: '9999',
      invoiceNumber: 'new',
      poNumber: 'new-po',
      totalAmount: '0',
      notes: 'note',
    });
    expect(f.metadata.domainEvents).toHaveLength(1);
    expect(f.metadatas.save).toHaveBeenCalledWith(
      f.metadata,
      f.input.workspaceId
    );
  });
  it('invalid metadata leaves all fields and events unchanged', async () => {
    const f = fixture();
    const before = ReceiptMetadata.toDTO(f.metadata);
    await expect(
      new Commands.UpdateReceiptMetadataHandler(f.service).handle({
        ...f.input,
        merchantName: 'changed',
        lastFourDigits: 'bad',
      })
    ).rejects.toThrow();
    expect(ReceiptMetadata.toDTO(f.metadata)).toEqual(before);
    expect(f.metadata.domainEvents).toHaveLength(0);
    expect(f.metadatas.save).not.toHaveBeenCalled();
  });
  it('rejects invalid OCR before changing receipt state or saving', async () => {
    const f = fixture();
    await expect(
      f.service.processReceipt(
        f.input.receiptId,
        f.input.workspaceId,
        f.input.userId,
        'text',
        1.234
      )
    ).rejects.toThrow();
    expect(f.receipt.status).toBe('PENDING');
    expect(f.receipt.domainEvents).toHaveLength(0);
    expect(f.receipts.save).not.toHaveBeenCalled();
    expect(
      processReceiptSchema.safeParse({ ocrConfidence: 1.234 }).success
    ).toBe(false);
  });
  it('saves both processing transitions in a single write', async () => {
    const f = fixture();
    await f.service.processReceipt(
      f.input.receiptId,
      f.input.workspaceId,
      f.input.userId,
      'text',
      90
    );
    expect(f.receipts.save).toHaveBeenCalledOnce();
    expect(f.receipt.domainEvents.map((e) => e.eventType)).toEqual([
      'ReceiptProcessingStarted',
      'ReceiptProcessed',
    ]);
  });
  it('has no earlier committed processing write when completion fails', async () => {
    const f = fixture();
    f.receipts.save.mockRejectedValue(new Error('outbox rollback'));
    await expect(
      f.service.processReceipt(
        f.input.receiptId,
        f.input.workspaceId,
        f.input.userId,
        'text',
        90
      )
    ).rejects.toThrow('outbox rollback');
    expect(f.receipts.save).toHaveBeenCalledOnce();
    expect(f.receipt.domainEvents).toHaveLength(2);
  });
  it.each([
    'verify',
    'reject',
    'thumbnail',
    'process',
    'delete',
    'restore',
    'metadata',
    'tag',
    'download',
  ])('%s rejects another owner before side effects', async (operation) => {
    const f = fixture(),
      other = randomUUID(),
      { receiptId, workspaceId } = f.input;
    const operations = {
      verify: () => f.service.verifyReceipt(receiptId, workspaceId, other),
      reject: () => f.service.rejectReceipt(receiptId, workspaceId, other),
      thumbnail: () =>
        f.service.setThumbnail(receiptId, 'preview.png', workspaceId, other),
      process: () => f.service.processReceipt(receiptId, workspaceId, other),
      delete: () => f.service.deleteReceipt(receiptId, workspaceId, other),
      restore: () => f.service.restoreReceipt(receiptId, workspaceId, other),
      metadata: () =>
        f.service.updateMetadata(receiptId, workspaceId, other, {
          notes: 'changed',
        }),
      tag: () =>
        f.service.addTag(receiptId, f.tag.id.getValue(), workspaceId, other),
      download: () => f.service.downloadReceipt(receiptId, workspaceId, other),
    };
    await expect(
      operations[operation as keyof typeof operations]()
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(f.receipts.save).not.toHaveBeenCalled();
    expect(f.metadatas.save).not.toHaveBeenCalled();
    expect(f.tags.addTag).not.toHaveBeenCalled();
    expect(f.storage.download).not.toHaveBeenCalled();
  });
  it('rejects cross-workspace lookup before changing an aggregate', async () => {
    const f = fixture();
    f.receipts.findById.mockResolvedValue(null);
    await expect(
      f.service.rejectReceipt(f.input.receiptId, randomUUID(), f.input.userId)
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(f.receipts.save).not.toHaveBeenCalled();
  });
  it('does not bypass ownership for an empty actor', async () => {
    const f = fixture();
    await expect(
      f.service.rejectReceipt(f.input.receiptId, f.input.workspaceId, '')
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(f.receipts.save).not.toHaveBeenCalled();
  });
  it('allows clearing tag color through HTTP validation and the command', async () => {
    const f = fixture();
    f.tag.updateColor('#112233');
    const input = updateTagSchema.parse({ color: '', description: '' });
    const result = await new Commands.UpdateTagHandler(f.tagService).handle({
      ...f.input,
      tagId: f.tag.id.getValue(),
      ...input,
    });
    expect(result.data?.color).toBeUndefined();
    expect(result.data?.description).toBeUndefined();
  });
  it('maps sequential duplicate metadata and tag creation without writing', async () => {
    const f = fixture();
    await expect(
      new Commands.AddReceiptMetadataHandler(f.service).handle(f.input)
    ).rejects.toMatchObject({ statusCode: 409 });
    f.definitions.findByName.mockResolvedValue(f.tag);
    await expect(
      new Commands.CreateTagHandler(f.tagService).handle({
        ...f.input,
        name: f.tag.name,
      })
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(f.metadatas.save).not.toHaveBeenCalled();
    expect(f.definitions.save).not.toHaveBeenCalled();
  });
});

describe('Application queries', () => {
  const cases: [string, (f: Fixture) => Promise<unknown>][] = [
    [
      'get receipt',
      (f) => new Queries.GetReceiptHandler(f.service).handle(f.input),
    ],
    [
      'list receipts',
      (f) =>
        new Queries.ListReceiptsHandler(f.service).handle({
          ...f.input,
          status: undefined,
          limit: 10,
          offset: 20,
        }),
    ],
    [
      'expense receipts',
      (f) =>
        new Queries.GetReceiptsByExpenseHandler(f.service).handle({
          ...f.input,
          expenseId: f.expenseId,
          limit: 10,
          offset: 20,
        }),
    ],
    [
      'metadata',
      (f) => new Queries.GetReceiptMetadataHandler(f.service).handle(f.input),
    ],
    [
      'stats',
      (f) => new Queries.GetReceiptStatsHandler(f.service).handle(f.input),
    ],
    [
      'tags',
      (f) =>
        new Queries.ListTagsHandler(f.tagService).handle({
          ...f.input,
          options: { limit: 10, offset: 20 },
        }),
    ],
    [
      'download',
      (f) => new Queries.DownloadReceiptHandler(f.service).handle(f.input),
    ],
  ];
  it.each(cases)('%s performs no writes', async (_name, execute) => {
    const f = fixture();
    expect(await execute(f)).toBeDefined();
    expect(f.receipts.save).not.toHaveBeenCalled();
    expect(f.metadatas.save).not.toHaveBeenCalled();
    expect(f.definitions.save).not.toHaveBeenCalled();
  });
  it('counts rejected receipts and preserves them through response validation', async () => {
    const f = fixture();
    const stats = await new Queries.GetReceiptStatsHandler(f.service).handle(
      f.input
    );
    expect(stats).toMatchObject({ total: 3, pending: 1, rejected: 2 });
    expect(receiptStatsResponseSchema.parse(stats).rejected).toBe(2);
    expect(f.receipts.getStatusCounts).toHaveBeenCalledWith(
      f.input.workspaceId
    );
  });
  it('preserves workspace, filters and pagination', async () => {
    const f = fixture();
    await new Queries.ListReceiptsHandler(f.service).handle({
      ...f.input,
      expenseId: f.expenseId,
      isDeleted: false,
      limit: 10,
      offset: 20,
    });
    expect(f.receipts.findByFilters).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: f.input.workspaceId,
        expenseId: f.expenseId,
        userId: f.input.userId,
        isDeleted: false,
      }),
      { limit: 10, offset: 20 }
    );
    await new Queries.GetReceiptsByExpenseHandler(f.service).handle({
      ...f.input,
      expenseId: f.expenseId,
      limit: 10,
      offset: 20,
    });
    expect(f.receipts.findByExpenseId).toHaveBeenCalledWith(
      f.expenseId,
      f.input.workspaceId,
      { limit: 10, offset: 20 }
    );
  });
  it.each([
    { limit: 0 },
    { limit: 101 },
    { offset: -1 },
    { offset: 2147483648 },
    { offset: NaN },
  ])('rejects invalid pagination %s before querying', async (options) => {
    const f = fixture();
    await expect(
      f.service.filterReceipts({ workspaceId: f.input.workspaceId }, options)
    ).rejects.toThrow();
    expect(f.receipts.findByFilters).not.toHaveBeenCalled();
  });
  it('maps missing receipt and metadata to typed errors', async () => {
    const f = fixture();
    f.receipts.findById.mockResolvedValue(null);
    await expect(
      new Queries.GetReceiptHandler(f.service).handle(f.input)
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      new Queries.GetReceiptMetadataHandler(f.service).handle(f.input)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
