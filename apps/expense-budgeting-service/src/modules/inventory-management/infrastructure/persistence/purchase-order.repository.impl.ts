import { PrismaClient, Prisma } from '@prisma/client';
import { PurchaseOrder } from '../../domain/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../domain/entities/purchase-order-item.entity';
import { PurchaseOrderId } from '../../domain/value-objects/purchase-order-id.vo';
import { PurchaseOrderItemId } from '../../domain/value-objects/purchase-order-item-id.vo';
import { PurchaseOrderStatus } from '../../domain/enums/purchase-order-status';
import {
  IPurchaseOrderRepository,
  PurchaseOrderFilters,
} from '../../domain/repositories/purchase-order.repository';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';
import {
  PurchaseOrderNotFoundError,
  SupplierNotFoundError,
} from '../../domain/errors/inventory.errors';
export class PurchaseOrderRepositoryImpl
  extends PrismaRepository<PurchaseOrder>
  implements IPurchaseOrderRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(po: PurchaseOrder): Promise<void> {
    try {
      await this.runInTransaction(async (tx) => {
        await tx.purchaseOrder.upsert({
          where: { id: po.id.getValue(), workspaceId: po.workspaceId },
          create: {
            id: po.id.getValue(),
            workspaceId: po.workspaceId,
            supplierId: po.supplierId,
            status: po.status,
            orderDate: po.orderDate,
            expectedDate: po.expectedDate,
            receivedDate: po.receivedDate,
            notes: po.notes,
            totalAmount: po.totalAmount,
            currency: po.currency,
            createdBy: po.createdBy,
            createdAt: po.createdAt,
            updatedAt: po.updatedAt,
          },
          update: {
            status: po.status,
            expectedDate: po.expectedDate,
            receivedDate: po.receivedDate,
            notes: po.notes,
            totalAmount: po.totalAmount,
            updatedAt: po.updatedAt,
          },
        });
        await this.dispatchEvents(po, tx);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new SupplierNotFoundError(po.supplierId, po.workspaceId);
      }
      throw error;
    }
  }

  async findById(
    id: PurchaseOrderId,
    workspaceId: string
  ): Promise<PurchaseOrder | null> {
    const row = await this.prisma.purchaseOrder.findFirst({
      where: { id: id.getValue(), workspaceId },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PurchaseOrder>> {
    return PrismaRepositoryHelper.paginate(
      (page) =>
        this.prisma.purchaseOrder.findMany({
          where: { workspaceId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          ...page,
        }),
      () => this.prisma.purchaseOrder.count({ where: { workspaceId } }),
      (record) => this.toDomain(record),
      options
    );
  }

  async findByFilters(
    filters: PurchaseOrderFilters,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PurchaseOrder>> {
    const where: Prisma.PurchaseOrderWhereInput = {
      workspaceId: filters.workspaceId,
    };
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.supplierId) {
      where.supplierId = filters.supplierId;
    }

    return PrismaRepositoryHelper.paginate(
      (page) =>
        this.prisma.purchaseOrder.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          ...page,
        }),
      () => this.prisma.purchaseOrder.count({ where }),
      (record) => this.toDomain(record),
      options
    );
  }

  async delete(po: PurchaseOrder): Promise<void> {
    await this.runInTransaction(async (tx) => {
      await tx.purchaseOrder.delete({
        where: { id: po.id.getValue(), workspaceId: po.workspaceId },
      });
      await this.dispatchEvents(po, tx);
    });
  }

  async exists(id: PurchaseOrderId, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.purchaseOrder.count({
      where: { id: id.getValue(), workspaceId },
    });
    return count > 0;
  }

  // Item operations
  async saveItem(item: PurchaseOrderItem, workspaceId: string): Promise<void> {
    const parent = await this.prisma.purchaseOrder.findFirst({
      where: { id: item.purchaseOrderId, workspaceId },
      select: { id: true },
    });
    if (!parent)
      throw new PurchaseOrderNotFoundError(item.purchaseOrderId, workspaceId);
    await this.prisma.purchaseOrderItem.upsert({
      where: {
        id: item.id.getValue(),
        purchaseOrderId: item.purchaseOrderId,
        purchaseOrder: { workspaceId },
      },
      create: {
        id: item.id.getValue(),
        purchaseOrderId: item.purchaseOrderId,
        variantId: item.variantId,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        receivedQuantity: item.receivedQuantity,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
      update: {
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        receivedQuantity: item.receivedQuantity,
        updatedAt: item.updatedAt,
      },
    });
  }

  async findItemById(
    id: PurchaseOrderItemId,
    workspaceId: string
  ): Promise<PurchaseOrderItem | null> {
    const row = await this.prisma.purchaseOrderItem.findFirst({
      where: { id: id.getValue(), purchaseOrder: { workspaceId } },
    });
    if (!row) return null;
    return this.toItemDomain(row);
  }

  async findItemsByPurchaseOrder(
    purchaseOrderId: string,
    workspaceId: string
  ): Promise<PurchaseOrderItem[]> {
    const rows = await this.prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId, purchaseOrder: { workspaceId } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.toItemDomain(row));
  }

  async deleteItem(
    id: PurchaseOrderItemId,
    workspaceId: string
  ): Promise<void> {
    await this.prisma.purchaseOrderItem.deleteMany({
      where: { id: id.getValue(), purchaseOrder: { workspaceId } },
    });
  }

  private toDomain(row: Prisma.PurchaseOrderGetPayload<object>): PurchaseOrder {
    return PurchaseOrder.fromPersistence({
      id: PurchaseOrderId.fromString(row.id),
      workspaceId: row.workspaceId,
      supplierId: row.supplierId,
      status: row.status as PurchaseOrderStatus,
      orderDate: row.orderDate,
      expectedDate: row.expectedDate,
      receivedDate: row.receivedDate,
      notes: row.notes,
      totalAmount: Number(row.totalAmount),
      currency: row.currency,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toItemDomain(
    row: Prisma.PurchaseOrderItemGetPayload<object>
  ): PurchaseOrderItem {
    return PurchaseOrderItem.fromPersistence({
      id: PurchaseOrderItemId.fromString(row.id),
      purchaseOrderId: row.purchaseOrderId,
      variantId: row.variantId,
      variantName: row.variantName,
      quantity: row.quantity,
      unitPrice: Number(row.unitPrice),
      receivedQuantity: row.receivedQuantity,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
