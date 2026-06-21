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
import { IEventBus } from '@core/domain/events/domain-event';

export class ReceiptTagDefinitionRepositoryImpl
  extends PrismaRepository<ReceiptTagDefinition>
  implements IReceiptTagDefinitionRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(tag: ReceiptTagDefinition): Promise<void> {
    await this.prisma.receiptTagDefinition.upsert({
      where: { id: tag.id.getValue() },
      create: {
        id: tag.id.getValue(),
        workspaceId: tag.workspaceId,
        name: tag.name,
        color: tag.color,
        description: tag.description,
        createdAt: tag.createdAt,
      },
      update: {
        name: tag.name,
        color: tag.color,
        description: tag.description,
      },
    });
    await this.dispatchEvents(tag);
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
      this.prisma.receiptTagDefinition,
      {
        where: { workspaceId },
        orderBy: { name: 'asc' },
      },
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

  async delete(id: TagId, workspaceId: string): Promise<void> {
    await this.prisma.receiptTagDefinition.delete({
      where: {
        id: id.getValue(),
      },
    });
  }

  private toDomain(
    row: Prisma.ReceiptTagDefinitionGetPayload<object>
  ): ReceiptTagDefinition {
    return ReceiptTagDefinition.fromPersistence({
      id: TagId.fromString(row.id),
      workspaceId: row.workspaceId,
      name: row.name,
      color: row.color ?? undefined,
      description: row.description ?? undefined,
      createdAt: row.createdAt,
    });
  }
}
