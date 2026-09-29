import { IPurchaseOrderRepository } from '../../domain/repositories/purchase-order.repository';
import { ISupplierRepository } from '../../domain/repositories/supplier.repository';
import { PurchaseOrder, PurchaseOrderDTO } from '../../domain/entities/purchase-order.entity';
import { PurchaseOrderItem, PurchaseOrderItemDTO } from '../../domain/entities/purchase-order-item.entity';
import { PurchaseOrderId } from '../../domain/value-objects/purchase-order-id.vo';
import { PurchaseOrderItemId } from '../../domain/value-objects/purchase-order-item-id.vo';
import Decimal from 'decimal.js';
import { IUnitOfWork } from '@shared/application/ports/unit-of-work.port';
import { IInventoryWriteLock } from '../ports/inventory-write-lock.port';
import { StockService } from './stock.service';
import { TransactionType } from '../../domain/enums/transaction-type';
import { SupplierId } from '../../domain/value-objects/supplier-id.vo';
import { PurchaseOrderStatus } from '../../domain/enums/purchase-order-status';
import {
  PurchaseOrderNotFoundError,
  PurchaseOrderItemNotFoundError,
  SupplierNotFoundError,
  SupplierInactiveError,
  InvalidInventoryDataError,
  InvalidPurchaseOrderStatusError,
} from '../../domain/errors/inventory.errors';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export class PurchaseOrderService {
  constructor(
    private readonly poRepository: IPurchaseOrderRepository,
    private readonly supplierRepository: ISupplierRepository,
    private readonly stockService: StockService,
    private readonly unitOfWork: IUnitOfWork,
    private readonly writeLock: IInventoryWriteLock
  ) {}

  private async write<T>(workspaceId: string, work: () => Promise<T>): Promise<T> {
    return this.unitOfWork.execute(async () => {
      await this.writeLock.acquire(workspaceId);
      return work();
    });
  }

  async createPurchaseOrder(params: {
    workspaceId: string;
    supplierId: string;
    orderDate: Date;
    expectedDate?: Date;
    notes?: string;
    currency?: string;
    createdBy: string;
  }): Promise<PurchaseOrderDTO> {
    return this.write(params.workspaceId, async () => {
      const supplier = await this.supplierRepository.findById(
        SupplierId.fromString(params.supplierId),
        params.workspaceId
      );
      if (!supplier) {
        throw new SupplierNotFoundError(params.supplierId, params.workspaceId);
      }
      if (!supplier.isActive) {
        throw new SupplierInactiveError(params.supplierId);
      }

      const po = PurchaseOrder.create(params);
      await this.poRepository.save(po);
      return PurchaseOrder.toDTO(po);
    });
  }

  async updatePurchaseOrder(
    poId: string,
    workspaceId: string,
    updates: {
      notes?: string | null;
      expectedDate?: Date | null;
    }
  ): Promise<PurchaseOrderDTO> {
    return this.write(workspaceId, async () => {
      const po = await this.getPurchaseOrderOrThrow(poId, workspaceId);

      if (updates.notes !== undefined) {
        po.updateNotes(updates.notes);
      }
      if (updates.expectedDate !== undefined) {
        po.updateExpectedDate(updates.expectedDate);
      }

      await this.poRepository.save(po);
      return PurchaseOrder.toDTO(po);
    });
  }

  async deletePurchaseOrder(poId: string, workspaceId: string): Promise<void> {
    await this.write(workspaceId, async () => {
      const po = await this.getPurchaseOrderOrThrow(poId, workspaceId);
      po.markAsDeleted();
      await this.poRepository.delete(po);
    });
  }

  async submitPurchaseOrder(poId: string, workspaceId: string): Promise<PurchaseOrderDTO> {
    return this.write(workspaceId, async () => {
      const po = await this.getPurchaseOrderOrThrow(poId, workspaceId);
      const items = await this.poRepository.findItemsByPurchaseOrder(poId, workspaceId);
      po.submit(items);
      await this.poRepository.save(po);
      return PurchaseOrder.toDTO(po);
    });
  }

  async approvePurchaseOrder(poId: string, workspaceId: string): Promise<PurchaseOrderDTO> {
    return this.write(workspaceId, async () => {
      const po = await this.getPurchaseOrderOrThrow(poId, workspaceId);
      po.approve();
      await this.poRepository.save(po);
      return PurchaseOrder.toDTO(po);
    });
  }

  async receivePurchaseOrder(
    poId: string,
    workspaceId: string,
    locationId: string,
    receivedBy: string
  ): Promise<PurchaseOrderDTO> {
    return this.write(workspaceId, async () => {
      const po = await this.getPurchaseOrderOrThrow(poId, workspaceId);
      if (!po.isApproved()) {
        throw new InvalidPurchaseOrderStatusError(po.status, PurchaseOrderStatus.RECEIVED);
      }
      const items = await this.poRepository.findItemsByPurchaseOrder(poId, workspaceId);
      const outstanding = items.filter((item) => item.receivedQuantity < item.quantity);
      if (outstanding.length === 0) throw new InvalidInventoryDataError('Purchase order has no outstanding items');
      const completedItems = [...items];
      for (const item of outstanding) {
        const remaining = item.quantity - item.receivedQuantity;
        const receivedItem = po.receiveItem(item, item.quantity);
        await this.stockService.adjustStock({
          workspaceId,
          variantId: item.variantId,
          locationId,
          quantity: remaining,
          type: TransactionType.IN,
          referenceId: poId,
          referenceType: 'PURCHASE_ORDER',
          createdBy: receivedBy,
        });
        await this.poRepository.saveItem(receivedItem, workspaceId);
        completedItems[items.indexOf(item)] = receivedItem;
      }
      po.receive(completedItems);
      await this.poRepository.save(po);
      return PurchaseOrder.toDTO(po);
    });
  }

  async cancelPurchaseOrder(poId: string, workspaceId: string): Promise<PurchaseOrderDTO> {
    return this.write(workspaceId, async () => {
      const po = await this.getPurchaseOrderOrThrow(poId, workspaceId);
      po.cancel();
      await this.poRepository.save(po);
      return PurchaseOrder.toDTO(po);
    });
  }

  // Item management
  async addItem(params: {
    purchaseOrderId: string;
    workspaceId: string;
    variantId: string;
    variantName: string;
    quantity: number;
    unitPrice: number | string;
  }): Promise<PurchaseOrderItemDTO> {
    return this.write(params.workspaceId, async () => {
      const po = await this.getPurchaseOrderOrThrow(
        params.purchaseOrderId,
        params.workspaceId
      );

      const item = po.addItem({
        variantId: params.variantId,
        variantName: params.variantName,
        quantity: params.quantity,
        unitPrice:
          typeof params.unitPrice === 'string'
            ? Number(params.unitPrice)
            : params.unitPrice,
      });

      await this.poRepository.saveItem(item, params.workspaceId);
      await this.recalculateTotal(po, params.workspaceId);
      return PurchaseOrderItem.toDTO(item);
    });
  }

  async removeItem(itemId: string, purchaseOrderId: string, workspaceId: string): Promise<void> {
    await this.write(workspaceId, async () => {
      const item = await this.poRepository.findItemById(
        PurchaseOrderItemId.fromString(itemId), workspaceId
      );
      if (!item) {
        throw new PurchaseOrderItemNotFoundError(itemId);
      }
      if (item.purchaseOrderId !== purchaseOrderId) {
        throw new PurchaseOrderItemNotFoundError(itemId);
      }

      const po = await this.getPurchaseOrderOrThrow(purchaseOrderId, workspaceId);
      po.removeItem(item);
      await this.poRepository.deleteItem(PurchaseOrderItemId.fromString(itemId), workspaceId);
      await this.recalculateTotal(po, workspaceId);
    });
  }

  private async recalculateTotal(po: PurchaseOrder, workspaceId: string): Promise<void> {
    const items = await this.poRepository.findItemsByPurchaseOrder(po.id.getValue(), workspaceId);
    let total = new Decimal(0);
    for (const item of items) {
      total = total.plus(item.getLineTotal());
    }
    po.updateTotalAmount(total.toNumber());
    await this.poRepository.save(po);
  }

  async getPurchaseOrderById(
    poId: string,
    workspaceId: string
  ): Promise<PurchaseOrderDTO | null> {
    const po = await this.poRepository.findById(
      PurchaseOrderId.fromString(poId),
      workspaceId
    );
    return po ? PurchaseOrder.toDTO(po) : null;
  }

  async getPurchaseOrdersByWorkspace(
    workspaceId: string,
    filters?: { status?: PurchaseOrderStatus; supplierId?: string },
    options?: PaginationOptions
  ): Promise<PaginatedResult<PurchaseOrderDTO>> {
    let result;
    if (filters?.status || filters?.supplierId) {
      result = await this.poRepository.findByFilters(
        { workspaceId, ...filters },
        options
      );
    } else {
      result = await this.poRepository.findByWorkspace(workspaceId, options);
    }
    return {
      items: result.items.map((po) => PurchaseOrder.toDTO(po)),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };
  }

  async getItemsByPurchaseOrder(purchaseOrderId: string, workspaceId: string): Promise<PurchaseOrderItemDTO[]> {
    const items = await this.poRepository.findItemsByPurchaseOrder(purchaseOrderId, workspaceId);
    return items.map((item) => PurchaseOrderItem.toDTO(item));
  }

  private async getPurchaseOrderOrThrow(
    poId: string,
    workspaceId: string
  ): Promise<PurchaseOrder> {
    const po = await this.poRepository.findById(
      PurchaseOrderId.fromString(poId),
      workspaceId
    );
    if (!po) {
      throw new PurchaseOrderNotFoundError(poId, workspaceId);
    }
    return po;
  }
}
