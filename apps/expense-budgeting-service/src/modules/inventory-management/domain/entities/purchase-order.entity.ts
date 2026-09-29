import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';
import { PurchaseOrderId } from '../value-objects/purchase-order-id.vo';
import { UuidId } from '@core/domain/value-objects/uuid-id.base';
import { PurchaseOrderStatus, isValidStatusTransition } from '../enums/purchase-order-status';
import {
  InvalidPurchaseOrderStatusError,
  PurchaseOrderCannotBeEditedError,
  PurchaseOrderCannotBeDeletedError,
  InvalidInventoryDataError,
  InvalidQuantityError,
} from '../errors/inventory.errors';
import { PurchaseOrderItem, CreatePurchaseOrderItemData } from './purchase-order-item.entity';
import Decimal from 'decimal.js';
import { MAX_UNIT_PRICE, NOTES_MAX_LENGTH, SUPPORTED_CURRENCIES } from '../constants/inventory.constants';
// Domain Events
export class PurchaseOrderCreatedEvent extends DomainEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly workspaceId: string,
    public readonly supplierId: string,
    public readonly createdBy: string
  ) {
    super(purchaseOrderId, 'PurchaseOrder');
  }

  get eventType(): string { return 'purchase_order.created'; }

  getPayload(): Record<string, unknown> {
    return {
      purchaseOrderId: this.purchaseOrderId,
      workspaceId: this.workspaceId,
      supplierId: this.supplierId,
      createdBy: this.createdBy,
    };
  }
}

export class PurchaseOrderStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly workspaceId: string,
    public readonly fromStatus: string,
    public readonly toStatus: string
  ) {
    super(purchaseOrderId, 'PurchaseOrder');
  }

  get eventType(): string { return 'purchase_order.status_changed'; }

  getPayload(): Record<string, unknown> {
    return {
      purchaseOrderId: this.purchaseOrderId,
      workspaceId: this.workspaceId,
      fromStatus: this.fromStatus,
      toStatus: this.toStatus,
    };
  }
}

export class PurchaseOrderDeletedEvent extends DomainEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly workspaceId: string
  ) {
    super(purchaseOrderId, 'PurchaseOrder');
  }

  get eventType(): string { return 'purchase_order.deleted'; }

  getPayload(): Record<string, unknown> {
    return {
      purchaseOrderId: this.purchaseOrderId,
      workspaceId: this.workspaceId,
    };
  }
}

export class PurchaseOrderItemAddedEvent extends DomainEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly workspaceId: string,
    public readonly itemId: string,
    public readonly variantId: string,
    public readonly quantity: number,
    public readonly unitPrice: string
  ) {
    super(purchaseOrderId, 'PurchaseOrder');
  }

  get eventType(): string { return 'purchase_order.item_added'; }

  getPayload(): Record<string, unknown> {
    return {
      purchaseOrderId: this.purchaseOrderId,
      workspaceId: this.workspaceId,
      itemId: this.itemId,
      variantId: this.variantId,
      quantity: this.quantity,
      unitPrice: this.unitPrice,
    };
  }
}

export class PurchaseOrderItemRemovedEvent extends DomainEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly workspaceId: string,
    public readonly itemId: string,
    public readonly variantId: string
  ) {
    super(purchaseOrderId, 'PurchaseOrder');
  }

  get eventType(): string { return 'purchase_order.item_removed'; }

  getPayload(): Record<string, unknown> {
    return {
      purchaseOrderId: this.purchaseOrderId,
      workspaceId: this.workspaceId,
      itemId: this.itemId,
      variantId: this.variantId,
    };
  }
}

export class PurchaseOrderItemReceivedEvent extends DomainEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly workspaceId: string,
    public readonly itemId: string,
    public readonly variantId: string,
    public readonly receivedQuantity: number
  ) {
    super(purchaseOrderId, 'PurchaseOrder');
  }

  get eventType(): string { return 'purchase_order.item_received'; }

  getPayload(): Record<string, unknown> {
    return {
      purchaseOrderId: this.purchaseOrderId,
      workspaceId: this.workspaceId,
      itemId: this.itemId,
      variantId: this.variantId,
      receivedQuantity: this.receivedQuantity,
    };
  }
}

export interface PurchaseOrderProps {
  id: PurchaseOrderId;
  workspaceId: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  orderDate: Date;
  expectedDate: Date | null;
  receivedDate: Date | null;
  notes: string | null;
  totalAmount: number;
  currency: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePurchaseOrderData {
  workspaceId: string;
  supplierId: string;
  orderDate: Date;
  expectedDate?: Date;
  notes?: string;
  currency?: string;
  createdBy: string;
}

export interface PurchaseOrderDTO {
  purchaseOrderId: string;
  workspaceId: string;
  supplierId: string;
  status: string;
  orderDate: string;
  expectedDate: string | null;
  receivedDate: string | null;
  notes: string | null;
  totalAmount: string;
  currency: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export class PurchaseOrder extends AggregateRoot {
  private deletionMarked = false;
  private constructor(private props: PurchaseOrderProps) {
    super();
  }

  static create(data: CreatePurchaseOrderData): PurchaseOrder {
    if (!UuidId.isValid(data.workspaceId) || !UuidId.isValid(data.supplierId) || !UuidId.isValid(data.createdBy)) {
      throw new InvalidInventoryDataError('Invalid purchase order UUID');
    }
    if (!data.supplierId) {
      throw new InvalidInventoryDataError('Supplier ID is required');
    }
    if (!(data.orderDate instanceof Date) || Number.isNaN(data.orderDate.getTime())) {
      throw new InvalidInventoryDataError('Order date is required');
    }
    if (data.expectedDate !== undefined && (!(data.expectedDate instanceof Date) || Number.isNaN(data.expectedDate.getTime()) || data.expectedDate < data.orderDate)) {
      throw new InvalidInventoryDataError('Expected date must be valid and not before order date');
    }
    if (data.notes && data.notes.length > NOTES_MAX_LENGTH) throw new InvalidInventoryDataError('Purchase order notes are too long');
    if (data.currency && !SUPPORTED_CURRENCIES.includes(data.currency)) throw new InvalidInventoryDataError('Unsupported currency');

    const now = new Date();
    const po = new PurchaseOrder({
      id: PurchaseOrderId.create(),
      workspaceId: data.workspaceId,
      supplierId: data.supplierId,
      status: PurchaseOrderStatus.DRAFT,
      orderDate: new Date(data.orderDate),
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
      receivedDate: null,
      notes: data.notes || null,
      totalAmount: 0,
      currency: data.currency || 'USD',
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    po.addDomainEvent(
      new PurchaseOrderCreatedEvent(
        po.id.getValue(),
        po.workspaceId,
        po.supplierId,
        po.createdBy
      )
    );

    return po;
  }

  static fromPersistence(props: PurchaseOrderProps): PurchaseOrder {
    return new PurchaseOrder({ ...props, orderDate: new Date(props.orderDate), expectedDate: props.expectedDate ? new Date(props.expectedDate) : null, receivedDate: props.receivedDate ? new Date(props.receivedDate) : null, createdAt: new Date(props.createdAt), updatedAt: new Date(props.updatedAt) });
  }

  private ensureEditable(): void {
    if (this.props.status !== PurchaseOrderStatus.DRAFT) {
      throw new PurchaseOrderCannotBeEditedError(this.props.status);
    }
  }

  updateNotes(notes: string | null): void {
    this.ensureEditable();
    if (notes && notes.length > NOTES_MAX_LENGTH) throw new InvalidInventoryDataError('Purchase order notes are too long');
    if (notes === this.props.notes) return;
    this.props.notes = notes;
    this.props.updatedAt = new Date();
  }

  updateExpectedDate(date: Date | null): void {
    this.ensureEditable();
    if (date !== null && (!(date instanceof Date) || Number.isNaN(date.getTime()) || date < this.props.orderDate)) throw new InvalidInventoryDataError('Expected date must be valid and not before order date');
    if (date?.getTime() === this.props.expectedDate?.getTime() || (date === null && this.props.expectedDate === null)) return;
    this.props.expectedDate = date ? new Date(date) : null;
    this.props.updatedAt = new Date();
  }

  updateTotalAmount(amount: number): void {
    this.ensureEditable();
    if (!Number.isFinite(amount) || amount < 0 || amount > MAX_UNIT_PRICE || new Decimal(amount).decimalPlaces() > 2) throw new InvalidInventoryDataError('Invalid purchase order total');
    if (amount === this.props.totalAmount) return;
    this.props.totalAmount = amount;
    this.props.updatedAt = new Date();
  }

  private transitionTo(newStatus: PurchaseOrderStatus): void {
    if (!isValidStatusTransition(this.props.status, newStatus)) {
      throw new InvalidPurchaseOrderStatusError(this.props.status, newStatus);
    }
    const fromStatus = this.props.status;
    this.props.status = newStatus;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new PurchaseOrderStatusChangedEvent(
        this.id.getValue(),
        this.workspaceId,
        fromStatus,
        newStatus
      )
    );
  }

  private assertItemsBelongToOrder(items: readonly PurchaseOrderItem[]): void {
    if (!Array.isArray(items) || items.length === 0) throw new InvalidInventoryDataError('Purchase order must contain at least one item');
    const ids = new Set<string>();
    for (const item of items) {
      if (item.purchaseOrderId !== this.id.getValue() || ids.has(item.id.getValue())) {
        throw new InvalidInventoryDataError('Purchase order contains an invalid or duplicate item');
      }
      ids.add(item.id.getValue());
    }
  }

  submit(items: readonly PurchaseOrderItem[]): void {
    if (!isValidStatusTransition(this.props.status, PurchaseOrderStatus.SUBMITTED)) {
      throw new InvalidPurchaseOrderStatusError(this.props.status, PurchaseOrderStatus.SUBMITTED);
    }
    this.assertItemsBelongToOrder(items);
    this.transitionTo(PurchaseOrderStatus.SUBMITTED);
  }

  approve(): void {
    this.transitionTo(PurchaseOrderStatus.APPROVED);
  }

  receive(items: readonly PurchaseOrderItem[]): void {
    if (!isValidStatusTransition(this.props.status, PurchaseOrderStatus.RECEIVED)) {
      throw new InvalidPurchaseOrderStatusError(this.props.status, PurchaseOrderStatus.RECEIVED);
    }
    this.assertItemsBelongToOrder(items);
    if (items.some((item) => item.receivedQuantity !== item.quantity)) {
      throw new InvalidInventoryDataError('All purchase-order items must be fully received');
    }
    this.transitionTo(PurchaseOrderStatus.RECEIVED);
    this.props.receivedDate = new Date();
  }

  cancel(): void {
    this.transitionTo(PurchaseOrderStatus.CANCELLED);
  }

  get id(): PurchaseOrderId { return this.props.id; }
  get workspaceId(): string { return this.props.workspaceId; }
  get supplierId(): string { return this.props.supplierId; }
  get status(): PurchaseOrderStatus { return this.props.status; }
  get orderDate(): Date { return new Date(this.props.orderDate); }
  get expectedDate(): Date | null { return this.props.expectedDate ? new Date(this.props.expectedDate) : null; }
  get receivedDate(): Date | null { return this.props.receivedDate ? new Date(this.props.receivedDate) : null; }
  get notes(): string | null { return this.props.notes; }
  get totalAmount(): number { return this.props.totalAmount; }
  get currency(): string { return this.props.currency; }
  get createdBy(): string { return this.props.createdBy; }
  get createdAt(): Date { return new Date(this.props.createdAt); }
  get updatedAt(): Date { return new Date(this.props.updatedAt); }

  isDraft(): boolean { return this.props.status === PurchaseOrderStatus.DRAFT; }
  isSubmitted(): boolean { return this.props.status === PurchaseOrderStatus.SUBMITTED; }
  isApproved(): boolean { return this.props.status === PurchaseOrderStatus.APPROVED; }
  isReceived(): boolean { return this.props.status === PurchaseOrderStatus.RECEIVED; }
  isCancelled(): boolean { return this.props.status === PurchaseOrderStatus.CANCELLED; }

  addItem(data: Omit<CreatePurchaseOrderItemData, 'purchaseOrderId'>): PurchaseOrderItem {
    this.ensureEditable();
    const item = PurchaseOrderItem.create({
      ...data,
      purchaseOrderId: this.id.getValue(),
    });
    this.addDomainEvent(
      new PurchaseOrderItemAddedEvent(
        this.id.getValue(),
        this.workspaceId,
        item.id.getValue(),
        item.variantId,
        item.quantity,
        item.unitPrice.toString()
      )
    );
    return item;
  }

  removeItem(item: PurchaseOrderItem): void {
    this.ensureEditable();
    if (item.purchaseOrderId !== this.id.getValue()) {
      throw new InvalidInventoryDataError('Item does not belong to this purchase order');
    }
    this.addDomainEvent(new PurchaseOrderItemRemovedEvent(
      this.id.getValue(), this.workspaceId, item.id.getValue(), item.variantId
    ));
  }

  receiveItem(item: PurchaseOrderItem, receivedQuantity: number): PurchaseOrderItem {
    if (this.props.status !== PurchaseOrderStatus.APPROVED) throw new InvalidPurchaseOrderStatusError(this.props.status, PurchaseOrderStatus.RECEIVED);
    if (item.purchaseOrderId !== this.id.getValue()) throw new InvalidInventoryDataError('Item does not belong to this purchase order');
    if (receivedQuantity <= item.receivedQuantity) throw new InvalidInventoryDataError('Received quantity must increase');
    if (!Number.isSafeInteger(receivedQuantity) || receivedQuantity > item.quantity) {
      throw new InvalidQuantityError('Received quantity must be a whole number within the ordered quantity');
    }
    const receivedItem = PurchaseOrderItem.fromPersistence({
      id: item.id,
      purchaseOrderId: item.purchaseOrderId,
      variantId: item.variantId,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      receivedQuantity,
      createdAt: item.createdAt,
      updatedAt: new Date(),
    });
    this.addDomainEvent(
      new PurchaseOrderItemReceivedEvent(
        this.id.getValue(),
        this.workspaceId,
        item.id.getValue(),
        item.variantId,
        receivedQuantity
      )
    );
    return receivedItem;
  }

  markAsDeleted(): void {
    if (!this.isDraft()) throw new PurchaseOrderCannotBeDeletedError(this.props.status);
    if (this.deletionMarked) return;
    this.deletionMarked = true;
    this.addDomainEvent(
      new PurchaseOrderDeletedEvent(
        this.id.getValue(),
        this.workspaceId
      )
    );
  }

  equals(other: PurchaseOrder): boolean {
    return this.props.id.equals(other.props.id);
  }

  static toDTO(po: PurchaseOrder): PurchaseOrderDTO {
    return {
      purchaseOrderId: po.id.getValue(),
      workspaceId: po.workspaceId,
      supplierId: po.supplierId,
      status: po.status,
      orderDate: po.orderDate.toISOString(),
      expectedDate: po.expectedDate?.toISOString() || null,
      receivedDate: po.receivedDate?.toISOString() || null,
      notes: po.notes,
      totalAmount: po.totalAmount.toString(),
      currency: po.currency,
      createdBy: po.createdBy,
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
    };
  }
}
