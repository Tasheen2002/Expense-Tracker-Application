import { PrismaClient, Prisma } from "@prisma/client";
import { IAttachmentRepository } from "../../domain/repositories/attachment.repository";
import { Attachment } from "../../domain/entities/attachment.entity";
import { AttachmentId } from "../../domain/value-objects/attachment-id";
import { ExpenseNotFoundError, FileSizeLimitExceededError } from '../../domain/errors/expense.errors';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';

export class AttachmentRepositoryImpl
  implements IAttachmentRepository
{
  constructor(protected readonly rootPrisma: PrismaClient) {}

  protected get prisma(): PrismaClient | Prisma.TransactionClient {
    return PrismaUnitOfWork.getClient(this.rootPrisma);
  }

  private async insert(attachment: Attachment): Promise<void> {
    await this.prisma.attachment.create({
      data: {
        id: attachment.id.getValue(),
        expenseId: attachment.expenseId,
        fileName: attachment.fileName,
        filePath: attachment.filePath,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        uploadedBy: attachment.uploadedBy,
        createdAt: attachment.createdAt,
      },
    });
  }

  async saveWithinSizeLimit(
    attachment: Attachment,
    workspaceId: string,
    maxTotalSize: number,
  ): Promise<void> {
    await new PrismaUnitOfWork(this.rootPrisma).execute(async () => {
      const client = this.prisma;
      // Serializes all uploads for this expense until the transaction commits.
      const expense = await client.$queryRaw<{ id: string }[]>`
        SELECT id FROM "expense_ledger"."expenses"
        WHERE id = ${attachment.expenseId}::uuid
          AND workspace_id = ${workspaceId}::uuid
        FOR UPDATE
      `;
      if (expense.length === 0) {
        throw new ExpenseNotFoundError(attachment.expenseId, workspaceId);
      }

      const totalSize = await this.getTotalSizeByExpense(attachment.expenseId, workspaceId);
      if (totalSize + attachment.fileSize > maxTotalSize) {
        throw new FileSizeLimitExceededError(totalSize + attachment.fileSize, maxTotalSize);
      }
      await this.insert(attachment);
    });
  }

  async findById(id: AttachmentId, workspaceId: string): Promise<Attachment | null> {
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id: id.getValue(),
        expense: { workspaceId },
      },
    });

    if (!attachment) return null;

    return this.toDomain(attachment);
  }

  async findByExpense(
    expenseId: string | { getValue(): string },
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Attachment>> {
    const expId = typeof expenseId === 'string' ? expenseId : expenseId.getValue();
    return PrismaRepositoryHelper.paginate(
      this.prisma.attachment,
      {
        where: {
          expenseId: expId,
          expense: { workspaceId },
        },
        orderBy: { createdAt: "desc" },
      },
      (attachment) => this.toDomain(attachment),
      options,
    );
  }

  async findByIds(ids: AttachmentId[], workspaceId: string): Promise<Attachment[]> {
    const attachments = await this.prisma.attachment.findMany({
      where: {
        id: { in: ids.map((id) => id.getValue()) },
        expense: { workspaceId },
      },
    });

    return attachments.map((attachment) => this.toDomain(attachment));
  }

  async delete(id: AttachmentId, workspaceId: string): Promise<void> {
    await this.prisma.attachment.deleteMany({
      where: {
        id: id.getValue(),
        expense: { workspaceId },
      },
    });
  }

  async deleteByExpense(
    expenseId: string | { getValue(): string },
    workspaceId: string,
  ): Promise<void> {
    const expId = typeof expenseId === 'string' ? expenseId : expenseId.getValue();
    await this.prisma.attachment.deleteMany({
      where: {
        expenseId: expId,
        expense: { workspaceId },
      },
    });
  }

  async exists(id: AttachmentId, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.attachment.count({
      where: {
        id: id.getValue(),
        expense: { workspaceId },
      },
    });
    return count > 0;
  }

  async getTotalSizeByExpense(
    expenseId: string | { getValue(): string },
    workspaceId: string,
  ): Promise<number> {
    const expId = typeof expenseId === 'string' ? expenseId : expenseId.getValue();
    const result = await this.prisma.attachment.aggregate({
      where: {
        expenseId: expId,
        expense: { workspaceId },
      },
      _sum: {
        fileSize: true,
      },
    });

    return result._sum.fileSize || 0;
  }

  private toDomain(data: Prisma.AttachmentGetPayload<{}>): Attachment {
    return Attachment.fromPersistence({
      id: AttachmentId.fromString(data.id),
      expenseId: data.expenseId,
      fileName: data.fileName,
      filePath: data.filePath,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      uploadedBy: data.uploadedBy,
      createdAt: data.createdAt,
    });
  }
}
