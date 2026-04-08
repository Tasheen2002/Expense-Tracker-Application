import { PrismaClient, Prisma } from '@prisma/client';
import { InventoryTransaction } from '../../domain/entities/inventory-transaction.entity';
import { InventoryTransactionId } from '../../domain/value-objects/inventory-transaction-id.vo';
import { TransactionType } from '../../domain/enums/transaction-type';
import { IInventoryTransactionRepository } from '../../domain/repositories/inventory-transaction.repository';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';

export class InventoryTransactionRepositoryImpl
  implements IInventoryTransactionRepository
{
  protected readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async save(transaction: InventoryTransaction): Promise<void> {
    await this.prisma.inventoryTransaction.create({
      data: {
        id: transaction.id.getValue(),
        workspaceId: transaction.workspaceId,
        variantId: transaction.variantId,
        locationId: transaction.locationId,
        type: transaction.type,
        quantity: transaction.quantity,
        referenceId: transaction.referenceId,
        referenceType: transaction.referenceType,
        notes: transaction.notes,
        createdBy: transaction.createdBy,
        createdAt: transaction.createdAt,
      },
    });
  }

  async findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<InventoryTransaction>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.inventoryTransaction,
      { where: { workspaceId }, orderBy: { createdAt: 'desc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  async findByVariant(
    variantId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<InventoryTransaction>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.inventoryTransaction,
      { where: { variantId, workspaceId }, orderBy: { createdAt: 'desc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  async findByLocation(
    locationId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<InventoryTransaction>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.inventoryTransaction,
      { where: { locationId, workspaceId }, orderBy: { createdAt: 'desc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  private toDomain(
    row: Prisma.InventoryTransactionGetPayload<object>
  ): InventoryTransaction {
    return InventoryTransaction.fromPersistence({
      id: InventoryTransactionId.fromString(row.id),
      workspaceId: row.workspaceId,
      variantId: row.variantId,
      locationId: row.locationId,
      type: row.type as TransactionType,
      quantity: row.quantity,
      referenceId: row.referenceId,
      referenceType: row.referenceType,
      notes: row.notes,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    });
  }
}
