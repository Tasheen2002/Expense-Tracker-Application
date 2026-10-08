import { PrismaClient, Prisma } from '@prisma/client';
import { ReceiptId } from '../../domain/value-objects/receipt-id';
import { TagId } from '../../domain/value-objects/tag-id';
import { IReceiptTagRepository } from '../../domain/repositories/receipt-tag.repository';
import { ReceiptNotFoundError, ReceiptTagNotFoundError } from '../../domain/errors/receipt.errors';
import { ReceiptAuditEvent } from '../../domain/entities/receipt-validation';

export class ReceiptTagRepositoryImpl implements IReceiptTagRepository {
  constructor(private readonly prisma: PrismaClient) {}
  private async parent(tx: Prisma.TransactionClient, receiptId: ReceiptId, workspaceId: string) {
    await tx.$queryRaw`SELECT id FROM receipt_vault.receipts WHERE id = ${receiptId.getValue()}::uuid AND workspace_id = ${workspaceId}::uuid AND deleted_at IS NULL FOR UPDATE`;
    const row = await tx.receipt.findFirst({ where: { id: receiptId.getValue(), workspaceId, deletedAt: null } });
    if (!row) throw new ReceiptNotFoundError(receiptId.getValue(), workspaceId);
    return row;
  }
  private async event(tx: Prisma.TransactionClient, type: 'ReceiptTagAssigned' | 'ReceiptTagRemoved', receiptId: string, tagId: string, workspaceId: string, userId: string) {
    const event = new ReceiptAuditEvent(receiptId, 'Receipt', type, { receiptId, tagId, workspaceId, userId });
    await tx.outboxEvent.create({ data: { id: event.eventId, aggregateId: receiptId, aggregateType: 'Receipt', eventType: type, createdAt: event.occurredAt, status: 'PENDING', payload: event.getPayload() as Prisma.InputJsonObject } });
  }
  async addTag(receiptId: ReceiptId, tagId: TagId, workspaceId: string): Promise<void> {
    await this.prisma.$transaction(async tx => {
      const parent = await this.parent(tx, receiptId, workspaceId);
      const tag = await tx.receiptTagDefinition.findFirst({ where: { id: tagId.getValue(), workspaceId } });
      if (!tag) throw new ReceiptTagNotFoundError(tagId.getValue(), workspaceId);
      const result = await tx.receiptTag.createMany({ data: { receiptId: receiptId.getValue(), tagId: tagId.getValue(), workspaceId }, skipDuplicates: true });
      if (result.count) await this.event(tx, 'ReceiptTagAssigned', parent.id, tagId.getValue(), workspaceId, parent.userId);
    });
  }
  async removeTag(receiptId: ReceiptId, tagId: TagId, workspaceId: string): Promise<void> {
    await this.prisma.$transaction(async tx => {
      const parent = await this.parent(tx, receiptId, workspaceId);
      const result = await tx.receiptTag.deleteMany({ where: { receiptId: receiptId.getValue(), tagId: tagId.getValue(), workspaceId } });
      if (result.count) await this.event(tx, 'ReceiptTagRemoved', parent.id, tagId.getValue(), workspaceId, parent.userId);
    });
  }
  async findTagsByReceipt(receiptId: ReceiptId, workspaceId: string): Promise<TagId[]> {
    const rows = await this.prisma.receiptTag.findMany({ where: { receiptId: receiptId.getValue(), workspaceId }, select: { tagId: true } });
    return rows.map(row => TagId.fromString(row.tagId));
  }
  async removeAllTagsFromReceipt(receiptId: ReceiptId, workspaceId: string): Promise<void> {
    await this.prisma.$transaction(async tx => {
      const parent = await this.parent(tx, receiptId, workspaceId);
      const rows = await tx.receiptTag.findMany({ where: { receiptId: parent.id, workspaceId } });
      await tx.receiptTag.deleteMany({ where: { receiptId: parent.id, workspaceId } });
      for (const row of rows) await this.event(tx, 'ReceiptTagRemoved', parent.id, row.tagId, workspaceId, parent.userId);
    });
  }
  async hasTag(receiptId: ReceiptId, tagId: TagId, workspaceId: string): Promise<boolean> {
    return (await this.prisma.receiptTag.count({ where: { receiptId: receiptId.getValue(), tagId: tagId.getValue(), workspaceId } })) > 0;
  }
}
