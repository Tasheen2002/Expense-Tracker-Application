import { PrismaClient } from '@prisma/client'
import { ReceiptTagDefinition } from '../../domain/entities/receipt-tag-definition.entity'
import { TagId } from '../../domain/value-objects/tag-id'
import { IReceiptTagDefinitionRepository } from '../../domain/repositories/receipt-tag-definition.repository'

export class ReceiptTagDefinitionRepositoryImpl implements IReceiptTagDefinitionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(tag: ReceiptTagDefinition): Promise<void> {
    await this.prisma.receiptTagDefinition.upsert({
      where: { id: tag.getId().getValue() },
      create: {
        id: tag.getId().getValue(),
        workspaceId: tag.getWorkspaceId(),
        name: tag.getName(),
        color: tag.getColor(),
        description: tag.getDescription(),
        createdAt: tag.getCreatedAt(),
      },
      update: {
        name: tag.getName(),
        color: tag.getColor(),
        description: tag.getDescription(),
      },
    })
  }

  async findById(id: TagId, workspaceId: string): Promise<ReceiptTagDefinition | null> {
    const row = await this.prisma.receiptTagDefinition.findFirst({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    })

    return row ? this.toDomain(row) : null
  }

  async findByName(name: string, workspaceId: string): Promise<ReceiptTagDefinition | null> {
    const row = await this.prisma.receiptTagDefinition.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name,
        },
      },
    })

    return row ? this.toDomain(row) : null
  }

  async findByWorkspace(workspaceId: string): Promise<ReceiptTagDefinition[]> {
    const rows = await this.prisma.receiptTagDefinition.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    })

    return rows.map((row) => this.toDomain(row))
  }

  async exists(id: TagId, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.receiptTagDefinition.count({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    })

    return count > 0
  }

  async existsByName(name: string, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.receiptTagDefinition.count({
      where: {
        name,
        workspaceId,
      },
    })

    return count > 0
  }

  async delete(id: TagId, workspaceId: string): Promise<void> {
    await this.prisma.receiptTagDefinition.delete({
      where: {
        id: id.getValue(),
      },
    })
  }

  private toDomain(row: any): ReceiptTagDefinition {
    return ReceiptTagDefinition.fromPersistence({
      id: TagId.fromString(row.id),
      workspaceId: row.workspaceId,
      name: row.name,
      color: row.color,
      description: row.description,
      createdAt: row.createdAt,
    })
  }
}
