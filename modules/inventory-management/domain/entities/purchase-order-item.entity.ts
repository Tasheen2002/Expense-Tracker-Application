import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';
import { PurchaseOrderItemId } from '../value-objects/purchase-order-item-id.vo';
import {
  InvalidInventoryDataError,
  InvalidQuantityError,
} from '../errors/inventory.errors';
import { Decimal } from '@prisma/client/runtime/library';

export interface PurchaseOrderItemProps {
  id: PurchaseOrderItemId;
  purchaseOrderId: string;
  variantId: string;
  variantName: string;
  quantity: number;
  unitPrice: Decimal;
  receivedQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePurchaseOrderItemData {
  purchaseOrderId: string;
  variantId: string;
  variantName: string;
  quantity: number;
  unitPrice: number | string | Decimal;
}

export interface PurchaseOrderItemDTO {
  itemId: string;
  purchaseOrderId: string;
  variantId: string;
  variantName: string;
  quantity: number;
  unitPrice: string;
  receivedQuantity: number;
  lineTotal: string;
  createdAt: string;
  updatedAt: string;
}

export class PurchaseOrderItem extends AggregateRoot {
  private constructor(private props: PurchaseOrderItemProps) {
    super();
  }

  static create(data: CreatePurchaseOrderItemData): PurchaseOrderItem {
    if (!data.variantId || data.variantId.trim().length === 0) {
      throw new InvalidInventoryDataError('Variant ID is required');
    }
    if (!data.variantName || data.variantName.trim().length === 0) {
      throw new InvalidInventoryDataError('Variant name is required');
    }
    if (data.quantity <= 0) {
      throw new InvalidQuantityError('Quantity must be greater than zero');
    }

    const unitPrice =
      typeof data.unitPrice === 'number' || typeof data.unitPrice === 'string'
        ? new Decimal(data.unitPrice)
        : data.unitPrice;

    if (unitPrice.isNegative()) {
      throw new InvalidInventoryDataError('Unit price cannot be negative');
    }

    const now = new Date();
    return new PurchaseOrderItem({
      id: PurchaseOrderItemId.create(),
      purchaseOrderId: data.purchaseOrderId,
      variantId: data.variantId.trim(),
      variantName: data.variantName.trim(),
      quantity: data.quantity,
      unitPrice,
      receivedQuantity: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: PurchaseOrderItemProps): PurchaseOrderItem {
    return new PurchaseOrderItem(props);
  }

  updateQuantity(quantity: number): void {
    if (quantity <= 0) {
      throw new InvalidQuantityError('Quantity must be greater than zero');
    }
    this.props.quantity = quantity;
    this.props.updatedAt = new Date();
  }

  updateUnitPrice(unitPrice: number | string | Decimal): void {
    const price =
      typeof unitPrice === 'number' || typeof unitPrice === 'string'
        ? new Decimal(unitPrice)
        : unitPrice;
    if (price.isNegative()) {
      throw new InvalidInventoryDataError('Unit price cannot be negative');
    }
    this.props.unitPrice = price;
    this.props.updatedAt = new Date();
  }

  recordReceivedQuantity(quantity: number): void {
    if (quantity < 0) {
      throw new InvalidQuantityError('Received quantity cannot be negative');
    }
    this.props.receivedQuantity = quantity;
    this.props.updatedAt = new Date();
  }

  getLineTotal(): Decimal {
    return this.props.unitPrice.mul(this.props.quantity);
  }

  get id(): PurchaseOrderItemId {
    return this.props.id;
  }
  get purchaseOrderId(): string {
    return this.props.purchaseOrderId;
  }
  get variantId(): string {
    return this.props.variantId;
  }
  get variantName(): string {
    return this.props.variantName;
  }
  get quantity(): number {
    return this.props.quantity;
  }
  get unitPrice(): Decimal {
    return this.props.unitPrice;
  }
  get receivedQuantity(): number {
    return this.props.receivedQuantity;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  static toDTO(item: PurchaseOrderItem): PurchaseOrderItemDTO {
    return {
      itemId: item.id.getValue(),
      purchaseOrderId: item.purchaseOrderId,
      variantId: item.variantId,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toString(),
      receivedQuantity: item.receivedQuantity,
      lineTotal: item.getLineTotal().toString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
