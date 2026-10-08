import { afterAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Receipt } from '../domain/entities/receipt.entity';
import { ReceiptMetadata } from '../domain/entities/receipt-metadata.entity';
import { ReceiptTagDefinition } from '../domain/entities/receipt-tag-definition.entity';
import { StorageLocation } from '../domain/value-objects/storage-location';
import { StorageProvider } from '../domain/enums/storage-provider';
import { ReceiptRepositoryImpl } from '../infrastructure/persistence/receipt.repository.impl';
import { ReceiptMetadataRepositoryImpl } from '../infrastructure/persistence/receipt-metadata.repository.impl';
import { ReceiptTagDefinitionRepositoryImpl } from '../infrastructure/persistence/receipt-tag-definition.repository.impl';
import {
  listReceiptsQuerySchema,
  deleteReceiptQuerySchema,
} from '../infrastructure/http/validation/receipt.schema';
import { registerReceiptVaultRoutes } from '../infrastructure/http/routes';
import type { ReceiptController } from '../infrastructure/http/controllers/receipt.controller';
import type { TagController } from '../infrastructure/http/controllers/tag.controller';

vi.mock('@shared/middleware', () => ({
  workspaceAuthorizationMiddleware: async () => {},
}));
vi.mock('@shared/middleware/role-authorization.middleware', () => ({
  RolePermissions: { ADMIN_LEVEL: async () => {} },
}));

it('rejects invalid booleans, dates and reversed ranges', () => {
  for (const input of [
    { isLinked: 'invalid' },
    { isDeleted: 'invalid' },
    { fromDate: 'invalid' },
    { fromDate: '2026-02-30' },
    { fromDate: '2026-02-02', toDate: '2026-02-01' },
  ]) {
    expect(listReceiptsQuerySchema.safeParse(input).success).toBe(false);
  }
  expect(
    listReceiptsQuerySchema.parse({ isLinked: 'false', fromDate: '2026-02-01' })
  ).toMatchObject({ isLinked: false, fromDate: new Date('2026-02-01') });
  expect(
    deleteReceiptQuerySchema.safeParse({ permanent: 'invalid' }).success
  ).toBe(false);
  expect(deleteReceiptQuerySchema.parse({})).toEqual({ permanent: false });
});

it('Fastify and Zod agree on list dates and boolean filters', async () => {
  const app = Fastify();
  app.decorate('authenticate', async () => {});
  const listReceipts: ReceiptController['listReceipts'] = async (
    request,
    reply
  ) => {
    expect(request.query.isLinked).toBe(false);
    expect(request.query.fromDate).toBeInstanceOf(Date);
    return reply.send({
      success: true,
      statusCode: 200,
      message: 'ok',
      data: { items: [], total: 0, limit: 50, offset: 0, hasMore: false },
    });
  };
  try {
    await registerReceiptVaultRoutes(app, {
      receiptController: { listReceipts } as ReceiptController,
      tagController: {} as TagController,
    });
    const path = `/api/v1/workspaces/${randomUUID()}/receipts`;
    for (const query of [
      'isLinked=invalid',
      'fromDate=invalid',
      'fromDate=2026-02-30',
      'fromDate=2026-02-02&toDate=2026-02-01',
    ]) {
      expect((await app.inject(`${path}?${query}`)).statusCode).toBe(400);
    }
    for (const date of ['2026-02-01', '2026-02-01T10:00:00Z']) {
      expect(
        (await app.inject(`${path}?isLinked=false&fromDate=${date}`)).statusCode
      ).toBe(200);
    }
  } finally {
    await app.close();
  }
});

it('tag mutations have one rate check per authenticated actor', async () => {
  const before = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  const app = Fastify();
  app.decorate('authenticate', async (request) => {
    const userId = request.headers['x-user-id'] as string;
    request.user = { id: userId, userId, email: '' };
  });
  try {
    await registerReceiptVaultRoutes(app, {
      receiptController: {} as ReceiptController,
      tagController: {
        createTag: async (_request, reply) => reply.send({ success: true }),
      } as TagController,
    });
    const url = `/api/v1/workspaces/${randomUUID()}/receipt-tags`;
    const actor = randomUUID();
    const first = await app.inject({
      method: 'POST',
      url,
      headers: { 'x-user-id': actor },
      payload: { name: 'tag' },
    });
    const second = await app.inject({
      method: 'POST',
      url,
      headers: { 'x-user-id': randomUUID() },
      payload: { name: 'tag' },
    });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(
      Number(first.headers['x-ratelimit-remaining']) -
        Number(second.headers['x-ratelimit-remaining'])
    ).toBe(0);
    const repeat = await app.inject({
      method: 'POST',
      url,
      headers: { 'x-user-id': actor },
      payload: { name: 'tag' },
    });
    expect(
      Number(first.headers['x-ratelimit-remaining']) -
        Number(repeat.headers['x-ratelimit-remaining'])
    ).toBe(1);
  } finally {
    await app.close();
    if (before === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = before;
  }
});

const url = process.env.RECEIPT_TEST_DATABASE_URL;
if (url && !new URL(url).pathname.startsWith('/codex_test_'))
  throw new Error('Dedicated test database required');
describe.skipIf(!url)('PostgreSQL infrastructure regressions', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const receipts = new ReceiptRepositoryImpl(prisma),
    metadata = new ReceiptMetadataRepositoryImpl(prisma),
    tags = new ReceiptTagDefinitionRepositoryImpl(prisma);
  const workspaceId = randomUUID(),
    userId = randomUUID();
  const make = () =>
    Receipt.create({
      workspaceId,
      userId,
      fileName: 'fixture.pdf',
      originalName: 'fixture.pdf',
      filePath: 'fixture.pdf',
      fileSize: 20,
      mimeType: 'application/pdf',
      storageLocation: StorageLocation.create({
        provider: StorageProvider.LOCAL,
        bucket: 'local',
        key: randomUUID() + '.pdf',
      }),
    });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects a stale metadata PATCH and preserves the committed field', async () => {
    const receipt = make();
    await receipts.save(receipt);
    await metadata.save(
      ReceiptMetadata.create({
        receiptId: receipt.id.getValue(),
        merchantName: 'Original',
        notes: 'original',
      }),
      workspaceId
    );
    const first = (await metadata.findByReceiptId(receipt.id, workspaceId))!;
    const stale = (await metadata.findByReceiptId(receipt.id, workspaceId))!;
    first.updateDetails({ merchantName: 'New merchant' });
    stale.updateDetails({ notes: 'new note' });
    await metadata.save(first, workspaceId);
    await expect(metadata.save(stale, workspaceId)).rejects.toMatchObject({
      code: 'RECEIPT_METADATA_WRITE_CONFLICT',
      statusCode: 409,
    });
    expect(stale.expectedVersion).toBe(0);
    expect(stale.domainEvents).toHaveLength(1);
    const row = await metadata.findByReceiptId(receipt.id, workspaceId);
    expect(row!.merchantName).toBe('New merchant');
    expect(row!.notes).toBe('original');
  });

  it('rejects a stale tag update after deletion without recreating it', async () => {
    const receipt = make();
    await receipts.save(receipt);
    const tag = ReceiptTagDefinition.create({
      workspaceId,
      name: randomUUID(),
    });
    await tags.save(tag, userId);
    await prisma.receiptTag.create({
      data: {
        receiptId: receipt.id.getValue(),
        tagId: tag.id.getValue(),
        workspaceId,
      },
    });
    const stale = (await tags.findById(tag.id, workspaceId))!;
    await tags.delete(tag.id, workspaceId, userId);
    stale.updateDescription('stale update');
    await expect(tags.save(stale, userId)).rejects.toMatchObject({
      code: 'RECEIPT_TAG_WRITE_CONFLICT',
      statusCode: 409,
    });
    expect(stale.expectedVersion).toBe(0);
    expect(stale.domainEvents).toHaveLength(1);
    expect(await tags.findById(tag.id, workspaceId)).toBeNull();
    expect(
      await prisma.receiptTag.count({ where: { tagId: tag.id.getValue() } })
    ).toBe(0);
  });

  it('preserves expenseId when combined with isLinked', async () => {
    const first = make(),
      second = make(),
      expenseId = randomUUID();
    first.linkToExpense(expenseId);
    second.linkToExpense(randomUUID());
    await receipts.save(first);
    await receipts.save(second);
    const result = await receipts.findByFilters({
      workspaceId,
      expenseId,
      isLinked: true,
    });
    expect(result.items.map((item) => item.id.getValue())).toEqual([
      first.id.getValue(),
    ]);
    expect(
      (
        await receipts.findByFilters({
          workspaceId,
          expenseId,
          isLinked: false,
        })
      ).total
    ).toBe(0);
  });

  it('allows one concurrent tag update and persists only its event', async () => {
    const tag = ReceiptTagDefinition.create({
      workspaceId,
      name: randomUUID(),
    });
    await tags.save(tag, userId);
    const first = (await tags.findById(tag.id, workspaceId))!;
    const second = (await tags.findById(tag.id, workspaceId))!;
    first.updateColor('#112233');
    second.updateDescription('concurrent');
    const results = await Promise.allSettled([
      tags.save(first, userId),
      tags.save(second, userId),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled')
    ).toHaveLength(1);
    const failed = results.find((result) => result.status === 'rejected');
    expect(failed?.status === 'rejected' && failed.reason).toMatchObject({
      code: 'RECEIPT_TAG_WRITE_CONFLICT',
    });
    expect((await tags.findById(tag.id, workspaceId))!.expectedVersion).toBe(1);
    expect(
      await prisma.outboxEvent.count({
        where: {
          aggregateId: tag.id.getValue(),
          eventType: 'ReceiptTagUpdated',
        },
      })
    ).toBe(1);
  });

  it('rolls back tag and metadata versions with their writes on outbox failure', async () => {
    const receipt = make();
    await receipts.save(receipt);
    const meta = ReceiptMetadata.create({
      receiptId: receipt.id.getValue(),
      notes: 'old',
    });
    await metadata.save(meta, workspaceId);
    const tag = ReceiptTagDefinition.create({
      workspaceId,
      name: randomUUID(),
      description: 'old',
    });
    await tags.save(tag, userId);
    meta.updateDetails({ notes: 'new' });
    tag.updateDescription('new');
    for (const entity of [meta, tag]) {
      const event = entity.domainEvents[0];
      await prisma.outboxEvent.create({
        data: {
          id: event.eventId,
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          eventType: event.eventType,
          payload: {},
          status: 'PENDING',
        },
      });
    }
    await expect(metadata.save(meta, workspaceId)).rejects.toMatchObject({
      code: 'P2002',
    });
    await expect(tags.save(tag, userId)).rejects.toMatchObject({
      code: 'P2002',
    });
    expect(meta.expectedVersion).toBe(0);
    expect(meta.domainEvents).toHaveLength(1);
    expect(tag.expectedVersion).toBe(0);
    expect(tag.domainEvents).toHaveLength(1);
    expect(
      (await metadata.findByReceiptId(receipt.id, workspaceId))!.notes
    ).toBe('old');
    expect((await tags.findById(tag.id, workspaceId))!.description).toBe('old');
    for (const entity of [meta, tag])
      await prisma.outboxEvent.delete({
        where: { id: entity.domainEvents[0].eventId },
      });
    await metadata.save(meta, workspaceId);
    await tags.save(tag, userId);
    expect(meta.expectedVersion).toBe(1);
    expect(tag.expectedVersion).toBe(1);
    expect(meta.domainEvents).toHaveLength(0);
    expect(tag.domainEvents).toHaveLength(0);
  });

  it('orders equal receipt timestamps by ID across pages', async () => {
    const first = make(),
      second = make(),
      scope = randomUUID();
    first.linkToExpense(scope);
    second.linkToExpense(scope);
    await receipts.save(first);
    await receipts.save(second);
    await prisma.receipt.updateMany({
      where: { id: { in: [first.id.getValue(), second.id.getValue()] } },
      data: { createdAt: new Date('2026-01-01') },
    });
    const ids = [first.id.getValue(), second.id.getValue()].sort().reverse();
    const page1 = await receipts.findByExpenseId(scope, workspaceId, {
      limit: 1,
      offset: 0,
    });
    const page2 = await receipts.findByExpenseId(scope, workspaceId, {
      limit: 1,
      offset: 1,
    });
    expect([
      page1.items[0].id.getValue(),
      page2.items[0].id.getValue(),
    ]).toEqual(ids);
  });
});
