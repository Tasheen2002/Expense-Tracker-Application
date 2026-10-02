import { PurchaseOrderItemId } from '../value-objects/purchase-order-item-id.vo';
import { UuidId } from '@core/domain/value-objects/uuid-id.base';
import Decimal from 'decimal.js';
import { MAX_QUANTITY, MAX_UNIT_PRICE, VARIANT_ID_MAX_LENGTH, VARIANT_NAME_MAX_LENGTH } from '../constants/inventory.constants';
import {
  InvalidInventoryDataError,
  InvalidQuantityError,
} from '../errors/inventory.errors';

export interface PurchaseOrderItemProps {
  id: PurchaseOrderItemId;
  purchaseOrderId: string;
  variantId: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  receivedQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePurchaseOrderItemData {
  purchaseOrderId: string;
  variantId: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
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

export class PurchaseOrderItem {
  private constructor(private props: PurchaseOrderItemProps) {}

  private static validateQuantity(quantity: number): void {
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new InvalidQuantityError('Quantity must be a positive whole number within the allowed range');
    }
  }

  private static validatePrice(price: number): void {
    if (!Number.isFinite(price) || price < 0 || price > MAX_UNIT_PRICE || new Decimal(price).decimalPlaces() > 2) {
      throw new InvalidInventoryDataError('Unit price must be a nonnegative amount with at most two decimal places');
    }
  }

  static create(data: CreatePurchaseOrderItemData): PurchaseOrderItem {
    if (!UuidId.isValid(data.purchaseOrderId)) throw new InvalidInventoryDataError('Invalid purchase order ID');
    if (!data.variantId?.trim() || data.variantId.trim().length > VARIANT_ID_MAX_LENGTH) {
      throw new InvalidInventoryDataError('Variant ID is required');
    }
    if (!data.variantName?.trim() || data.variantName.trim().length > VARIANT_NAME_MAX_LENGTH) {
      throw new InvalidInventoryDataError('Variant name is required');
    }
    PurchaseOrderItem.validateQuantity(data.quantity);
    PurchaseOrderItem.validatePrice(data.unitPrice);
    if (new Decimal(data.unitPrice).times(data.quantity).greaterThan(MAX_UNIT_PRICE)) throw new InvalidInventoryDataError('Line total exceeds the allowed amount');

    const now = new Date();
    return new PurchaseOrderItem({
      id: PurchaseOrderItemId.create(),
      purchaseOrderId: data.purchaseOrderId,
      variantId: data.variantId.trim(),
      variantName: data.variantName.trim(),
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      receivedQuantity: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: PurchaseOrderItemProps): PurchaseOrderItem {
    return new PurchaseOrderItem({ ...props, createdAt: new Date(props.createdAt), updatedAt: new Date(props.updatedAt) });
  }

  getLineTotal(): number {
    return new Decimal(this.props.unitPrice).times(this.props.quantity).toNumber();
  }

  get id(): PurchaseOrderItemId { return this.props.id; }
  get purchaseOrderId(): string { return this.props.purchaseOrderId; }
  get variantId(): string { return this.props.variantId; }
  get variantName(): string { return this.props.variantName; }
  get quantity(): number { return this.props.quantity; }
  get unitPrice(): number { return this.props.unitPrice; }
  get receivedQuantity(): number { return this.props.receivedQuantity; }
  get createdAt(): Date { return new Date(this.props.createdAt); }
  get updatedAt(): Date { return new Date(this.props.updatedAt); }

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
