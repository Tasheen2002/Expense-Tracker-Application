import { randomUUID } from 'node:crypto';
import {
  ReceiptTagNotFoundError,
  DuplicateTagNameError,
  ReceiptTagWriteConflictError,
} from '../../domain/errors/receipt.errors';
import { isUniqueConstraint } from '@shared/infrastructure/persistence/constraint-errors';
import { uuid } from '../../domain/entities/receipt-validation';
import { PrismaClient, Prisma } from '@prisma/client';
import { ReceiptTagDefinition } from '../../domain/entities/receipt-tag-definition.entity';
import { TagId } from '../../domain/value-objects/tag-id';
import { IReceiptTagDefinitionRepository } from '../../domain/repositories/receipt-tag-definition.repository';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';

export class ReceiptTagDefinitionRepositoryImpl
  extends PrismaRepository<ReceiptTagDefinition>
  implements IReceiptTagDefinitionRepository
{
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async save(tag: ReceiptTagDefinition, userId: string): Promise<void> {
    uuid(userId, 'userId');
    try {
      await this.persistWithEvents(
        tag,
        async (tx) => {
          if (tag.expectedVersion === undefined) {
            await tx.receiptTagDefinition.create({
              data: {
                version: 0,
                id: tag.id.getValue(),
                workspaceId: tag.workspaceId,
                name: tag.name,
                color: tag.color ?? null,
                description: tag.description ?? null,
                createdAt: tag.createdAt,
              },
            });
          } else {
            const result = await tx.receiptTagDefinition.updateMany({
              where: {
                id: tag.id.getValue(),
                workspaceId: tag.workspaceId,
                version: tag.expectedVersion,
              },
              data: {
                version: { increment: 1 },
                name: tag.name,
                color: tag.color ?? null,
                description: tag.description ?? null,
              },
            });
            if (result.count !== 1)
              throw new ReceiptTagWriteConflictError(tag.id.getValue());
          }
        },
        { workspaceId: tag.workspaceId, userId }
      );
      tag.acknowledgePersistence();
    } catch (error) {
      if (isUniqueConstraint(error, 'name', 'receipt_tag_workspace_name'))
        throw new DuplicateTagNameError(tag.name, tag.workspaceId);
      throw error;
    }
  }

  async findById(
    id: TagId,
    workspaceId: string
  ): Promise<ReceiptTagDefinition | null> {
    const row = await this.prisma.receiptTagDefinition.findFirst({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByName(
    name: string,
    workspaceId: string
  ): Promise<ReceiptTagDefinition | null> {
    const row = await this.prisma.receiptTagDefinition.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name,
        },
      },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ReceiptTagDefinition>> {
    return PrismaRepositoryHelper.paginate(
      (page) =>
        this.prisma.receiptTagDefinition.findMany({
          where: { workspaceId },
          orderBy: { name: 'asc' },
          ...page,
        }),
      () => this.prisma.receiptTagDefinition.count({ where: { workspaceId } }),
      (row) => this.toDomain(row),
      options
    );
  }

  async exists(id: TagId, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.receiptTagDefinition.count({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    });

    return count > 0;
  }

  async existsByName(name: string, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.receiptTagDefinition.count({
      where: {
        name,
        workspaceId,
      },
    });

    return count > 0;
  }

  async delete(id: TagId, workspaceId: string, userId: string): Promise<void> {
    uuid(userId, 'userId');
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.receiptTagDefinition.findFirst({
        where: { id: id.getValue(), workspaceId },
      });
      if (!row) throw new ReceiptTagNotFoundError(id.getValue(), workspaceId);
      await tx.receiptTagDefinition.delete({
        where: { id: row.id, workspaceId },
      });
      await tx.outboxEvent.create({
        data: {
          id: randomUUID(),
          aggregateId: row.id,
          aggregateType: 'ReceiptTagDefinition',
          eventType: 'ReceiptTagDeleted',
          status: 'PENDING',
          payload: { tagId: row.id, workspaceId, userId },
        },
      });
    });
  }

  private toDomain(
    row: Prisma.ReceiptTagDefinitionGetPayload<object>
  ): ReceiptTagDefinition {
    return ReceiptTagDefinition.fromPersistence({
      id: TagId.fromString(row.id),
      version: row.version,
      workspaceId: row.workspaceId,
      name: row.name,
      color: row.color ?? undefined,
      description: row.description ?? undefined,
      createdAt: row.createdAt,
    });
  }
}
