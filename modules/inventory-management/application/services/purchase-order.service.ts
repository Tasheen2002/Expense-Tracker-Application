import { IPurchaseOrderRepository } from '../../domain/repositories/purchase-order.repository';
import { ISupplierRepository } from '../../domain/repositories/supplier.repository';
import { PurchaseOrder } from '../../domain/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../domain/entities/purchase-order-item.entity';
import { PurchaseOrderId } from '../../domain/value-objects/purchase-order-id.vo';
import { PurchaseOrderItemId } from '../../domain/value-objects/purchase-order-item-id.vo';
import { SupplierId } from '../../domain/value-objects/supplier-id.vo';
import { PurchaseOrderStatus } from '../../domain/enums/purchase-order-status';
import {
  PurchaseOrderNotFoundError,
  PurchaseOrderItemNotFoundError,
  SupplierNotFoundError,
} from '../../domain/errors/inventory.errors';
import { Decimal } from '@prisma/client/runtime/library';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export class PurchaseOrderService {
  constructor(
    private readonly poRepository: IPurchaseOrderRepository,
    private readonly supplierRepository: ISupplierRepository
  ) {}

  async createPurchaseOrder(params: {
    workspaceId: string;
    supplierId: string;
    orderDate: Date;
    expectedDate?: Date;
    notes?: string;
    currency?: string;
    createdBy: string;
  }): Promise<PurchaseOrder> {
    const supplierExists = await this.supplierRepository.exists(
      SupplierId.fromString(params.supplierId),
      params.workspaceId
    );
    if (!supplierExists) {
      throw new SupplierNotFoundError(params.supplierId, params.workspaceId);
    }

    const po = PurchaseOrder.create(params);
    await this.poRepository.save(po);
    return po;
  }

  async updatePurchaseOrder(
    poId: string,
    workspaceId: string,
    updates: {
      notes?: string | null;
      expectedDate?: Date | null;
    }
  ): Promise<PurchaseOrder> {
    const po = await this.poRepository.findById(
      PurchaseOrderId.fromString(poId),
      workspaceId
    );
    if (!po) {
      throw new PurchaseOrderNotFoundError(poId, workspaceId);
    }

    if (updates.notes !== undefined) {
      po.updateNotes(updates.notes);
    }
    if (updates.expectedDate !== undefined) {
      po.updateExpectedDate(updates.expectedDate);
    }

    await this.poRepository.save(po);
    return po;
  }

  async deletePurchaseOrder(poId: string, workspaceId: string): Promise<void> {
    const exists = await this.poRepository.exists(
      PurchaseOrderId.fromString(poId),
      workspaceId
    );
    if (!exists) {
      throw new PurchaseOrderNotFoundError(poId, workspaceId);
    }
    await this.poRepository.delete(
      PurchaseOrderId.fromString(poId),
      workspaceId
    );
  }

  async submitPurchaseOrder(poId: string, workspaceId: string): Promise<PurchaseOrder> {
    const po = await this.getPurchaseOrderOrThrow(poId, workspaceId);
    po.submit();
    await this.poRepository.save(po);
    return po;
  }

  async approvePurchaseOrder(poId: string, workspaceId: string): Promise<PurchaseOrder> {
    const po = await this.getPurchaseOrderOrThrow(poId, workspaceId);
    po.approve();
    await this.poRepository.save(po);
    return po;
  }

  async receivePurchaseOrder(poId: string, workspaceId: string): Promise<PurchaseOrder> {
    const po = await this.getPurchaseOrderOrThrow(poId, workspaceId);
    po.receive();
    await this.poRepository.save(po);
    return po;
  }

  async cancelPurchaseOrder(poId: string, workspaceId: string): Promise<PurchaseOrder> {
    const po = await this.getPurchaseOrderOrThrow(poId, workspaceId);
    po.cancel();
    await this.poRepository.save(po);
    return po;
  }

  // Item management
  async addItem(params: {
    purchaseOrderId: string;
    workspaceId: string;
    variantId: string;
    variantName: string;
    quantity: number;
    unitPrice: number | string;
  }): Promise<PurchaseOrderItem> {
    const po = await this.getPurchaseOrderOrThrow(
      params.purchaseOrderId,
      params.workspaceId
    );

    const item = PurchaseOrderItem.create({
      purchaseOrderId: po.id.getValue(),
      variantId: params.variantId,
      variantName: params.variantName,
      quantity: params.quantity,
      unitPrice: params.unitPrice,
    });

    await this.poRepository.saveItem(item);
    await this.recalculateTotal(po.id.getValue(), params.workspaceId);
    return item;
  }

  async removeItem(itemId: string, workspaceId: string): Promise<void> {
    const item = await this.poRepository.findItemById(
      PurchaseOrderItemId.fromString(itemId)
    );
    if (!item) {
      throw new PurchaseOrderItemNotFoundError(itemId);
    }

    await this.poRepository.deleteItem(PurchaseOrderItemId.fromString(itemId));
    await this.recalculateTotal(item.purchaseOrderId, workspaceId);
  }

  private async recalculateTotal(poId: string, workspaceId: string): Promise<void> {
    const po = await this.poRepository.findById(
      PurchaseOrderId.fromString(poId),
      workspaceId
    );
    if (!po) return;

    const items = await this.poRepository.findItemsByPurchaseOrder(poId);
    let total = new Decimal(0);
    for (const item of items) {
      total = total.plus(item.getLineTotal());
    }
    po.updateTotalAmount(total);
    await this.poRepository.save(po);
  }

  async getPurchaseOrderById(
    poId: string,
    workspaceId: string
  ): Promise<PurchaseOrder | null> {
    return this.poRepository.findById(
      PurchaseOrderId.fromString(poId),
      workspaceId
    );
  }

  async getPurchaseOrdersByWorkspace(
    workspaceId: string,
    filters?: { status?: PurchaseOrderStatus; supplierId?: string },
    options?: PaginationOptions
  ): Promise<PaginatedResult<PurchaseOrder>> {
    if (filters?.status || filters?.supplierId) {
      return this.poRepository.findByFilters(
        { workspaceId, ...filters },
        options
      );
    }
    return this.poRepository.findByWorkspace(workspaceId, options);
  }

  async getItemsByPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderItem[]> {
    return this.poRepository.findItemsByPurchaseOrder(purchaseOrderId);
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
