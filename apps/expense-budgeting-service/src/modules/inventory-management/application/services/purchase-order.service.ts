import { IPurchaseOrderRepository } from '../../domain/repositories/purchase-order.repository';
import { ISupplierRepository } from '../../domain/repositories/supplier.repository';
import { PurchaseOrder, PurchaseOrderDTO } from '../../domain/entities/purchase-order.entity';
import { PurchaseOrderItem, PurchaseOrderItemDTO } from '../../domain/entities/purchase-order-item.entity';
import { PurchaseOrderId } from '../../domain/value-objects/purchase-order-id.vo';
import { PurchaseOrderItemId } from '../../domain/value-objects/purchase-order-item-id.vo';
import { SupplierId } from '../../domain/value-objects/supplier-id.vo';
import { PurchaseOrderStatus } from '../../domain/enums/purchase-order-status';
import {
  PurchaseOrderNotFoundError,
  PurchaseOrderItemNotFoundError,
  SupplierNotFoundError,
} from '../../domain/errors/inventory.errors';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

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
  }): Promise<PurchaseOrderDTO> {
    const supplierExists = await this.supplierRepository.exists(
      SupplierId.fromString(params.supplierId),
      params.workspaceId
    );
    if (!supplierExists) {
      throw new SupplierNotFoundError(params.supplierId, params.workspaceId);
    }

    const po = PurchaseOrder.create(params);
    await this.poRepository.save(po);
    return PurchaseOrder.toDTO(po);
  }

  async updatePurchaseOrder(
    poId: string,
    workspaceId: string,
    updates: {
      notes?: string | null;
      expectedDate?: Date | null;
    }
  ): Promise<PurchaseOrderDTO> {
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
    return PurchaseOrder.toDTO(po);
  }

  async deletePurchaseOrder(poId: string, workspaceId: string): Promise<void> {
    const po = await this.poRepository.findById(
      PurchaseOrderId.fromString(poId),
      workspaceId
    );
    if (!po) {
      throw new PurchaseOrderNotFoundError(poId, workspaceId);
    }
    po.markAsDeleted();
    await this.poRepository.delete(
      PurchaseOrderId.fromString(poId),
      workspaceId
    );
  }

  async submitPurchaseOrder(poId: string, workspaceId: string): Promise<PurchaseOrderDTO> {
    const po = await this.getPurchaseOrderOrThrow(poId, workspaceId);
    po.submit();
    await this.poRepository.save(po);
    return PurchaseOrder.toDTO(po);
  }

  async approvePurchaseOrder(poId: string, workspaceId: string): Promise<PurchaseOrderDTO> {
    const po = await this.getPurchaseOrderOrThrow(poId, workspaceId);
    po.approve();
    await this.poRepository.save(po);
    return PurchaseOrder.toDTO(po);
  }

  async receivePurchaseOrder(poId: string, workspaceId: string): Promise<PurchaseOrderDTO> {
    const po = await this.getPurchaseOrderOrThrow(poId, workspaceId);
    po.receive();
    await this.poRepository.save(po);
    return PurchaseOrder.toDTO(po);
  }

  async cancelPurchaseOrder(poId: string, workspaceId: string): Promise<PurchaseOrderDTO> {
    const po = await this.getPurchaseOrderOrThrow(poId, workspaceId);
    po.cancel();
    await this.poRepository.save(po);
    return PurchaseOrder.toDTO(po);
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
    const po = await this.getPurchaseOrderOrThrow(
      params.purchaseOrderId,
      params.workspaceId
    );

    const item = PurchaseOrderItem.create({
      purchaseOrderId: po.id.getValue(),
      variantId: params.variantId,
      variantName: params.variantName,
      quantity: params.quantity,
      unitPrice:
        typeof params.unitPrice === 'string'
          ? parseFloat(params.unitPrice)
          : params.unitPrice,
    });

    await this.poRepository.saveItem(item);
    await this.recalculateTotal(po.id.getValue(), params.workspaceId);
    return PurchaseOrderItem.toDTO(item);
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
    let total = 0;
    for (const item of items) {
      total += item.getLineTotal();
    }
    po.updateTotalAmount(total);
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

  async getItemsByPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderItemDTO[]> {
    const items = await this.poRepository.findItemsByPurchaseOrder(purchaseOrderId);
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
