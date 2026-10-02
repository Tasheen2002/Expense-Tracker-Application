import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { InMemoryEventBus } from '@expense-tracker/core';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';
import { AttachmentRepositoryImpl } from '../infrastructure/persistence/attachment.repository.impl';
import { ExpenseRepositoryImpl } from '../infrastructure/persistence/expense.repository.impl';
import { AttachmentService } from '../application/services/attachment.service';
import { ExpenseService } from '../application/services/expense.service';
import { CreateAttachmentHandler } from '../application/commands/create-attachment.command';
import { DeleteAttachmentHandler } from '../application/commands/delete-attachment.command';
import { FileSizeLimitExceededError } from '../domain/errors/expense.errors';
import { EXPENSE_EVENTS } from '@shared/events/expense-events';

const prisma = new PrismaClient();
const workspaceId = '79797979-1111-4111-8111-111111111111';
const userId = '79797979-2222-4222-8222-222222222222';
const attachmentService = new AttachmentService(new AttachmentRepositoryImpl(prisma));
const expenseService = new ExpenseService(new ExpenseRepositoryImpl(prisma, new InMemoryEventBus()));
const unitOfWork = new PrismaUnitOfWork(prisma);
const createHandler = new CreateAttachmentHandler(attachmentService, expenseService, unitOfWork);
const deleteHandler = new DeleteAttachmentHandler(attachmentService, expenseService, unitOfWork);

async function seedExpense(): Promise<string> {
  const id = randomUUID();
  await prisma.expense.create({
    data: {
      id,
      workspaceId,
      userId,
      title: 'Attachment transaction test',
      amount: 100,
      currency: 'USD',
      expenseDate: new Date(),
      status: 'DRAFT',
    },
  });
  return id;
}

function upload(expenseId: string, fileSize = 1024) {
  return {
    expenseId,
    workspaceId,
    fileName: 'receipt.pdf',
    filePath: `/uploads/${randomUUID()}.pdf`,
    fileSize,
    mimeType: 'application/pdf',
    uploadedBy: userId,
  };
}

describe('attachment PostgreSQL transaction and size limit', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await prisma.expense.deleteMany({ where: { workspaceId } });
  });

  afterAll(async () => {
    await prisma.expense.deleteMany({ where: { workspaceId } });
    await prisma.$disconnect();
  });

  it('creates and deletes an attachment with the expense version updated in each transaction', async () => {
    const expenseId = await seedExpense();
    const created = await createHandler.handle(upload(expenseId));
    const attachmentId = created.data!.attachmentId;

    expect(await prisma.attachment.count({ where: { id: attachmentId } })).toBe(1);
    expect((await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } })).version).toBe(2);

    await deleteHandler.handle({ attachmentId, expenseId, workspaceId, userId });
    expect(await prisma.attachment.count({ where: { id: attachmentId } })).toBe(0);
    expect((await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } })).version).toBe(3);
    const removalEvents = await prisma.outboxEvent.findMany({
      where: { aggregateId: expenseId, eventType: EXPENSE_EVENTS.ATTACHMENT_REMOVED },
    });
    expect(removalEvents).toHaveLength(1);
    expect(removalEvents[0].payload).toMatchObject({ expenseId, workspaceId, attachmentId });
  });

  it('rolls back the attachment insert if updating the expense fails', async () => {
    const expenseId = await seedExpense();
    vi.spyOn(expenseService, 'addAttachmentRecord').mockRejectedValueOnce(new Error('link failed'));

    await expect(createHandler.handle(upload(expenseId))).rejects.toThrow('link failed');
    expect(await prisma.attachment.count({ where: { expenseId } })).toBe(0);
    expect((await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } })).version).toBe(1);
  });

  it('rolls back the expense update if deleting the attachment fails', async () => {
    const expenseId = await seedExpense();
    const created = await createHandler.handle(upload(expenseId));
    const attachmentId = created.data!.attachmentId;
    const version = (await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } })).version;
    vi.spyOn(attachmentService, 'deleteAttachment').mockRejectedValueOnce(new Error('delete failed'));

    await expect(deleteHandler.handle({ attachmentId, expenseId, workspaceId, userId })).rejects.toThrow('delete failed');
    expect(await prisma.attachment.count({ where: { id: attachmentId } })).toBe(1);
    expect((await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } })).version).toBe(version);
    expect(await prisma.outboxEvent.count({
      where: { aggregateId: expenseId, eventType: EXPENSE_EVENTS.ATTACHMENT_REMOVED },
    })).toBe(0);
  });

  it('serializes concurrent uploads at the 50 MB expense limit', async () => {
    const expenseId = await seedExpense();
    const tenMB = 10 * 1024 * 1024;
    for (let i = 0; i < 4; i++) {
      await attachmentService.createAttachment(upload(expenseId, tenMB));
    }

    const results = await Promise.allSettled([
      attachmentService.createAttachment(upload(expenseId, tenMB)),
      attachmentService.createAttachment(upload(expenseId, tenMB)),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({ status: 'rejected', reason: expect.any(FileSizeLimitExceededError) });
    const total = await prisma.attachment.aggregate({ where: { expenseId }, _sum: { fileSize: true } });
    expect(total._sum.fileSize).toBe(50 * 1024 * 1024);
  });
});
