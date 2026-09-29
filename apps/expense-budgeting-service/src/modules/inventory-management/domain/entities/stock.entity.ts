import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';
import { StockId } from '../value-objects/stock-id.vo';
import { UuidId } from '@core/domain/value-objects/uuid-id.base';
import { InsufficientStockError, InvalidQuantityError, InvalidInventoryDataError } from '../errors/inventory.errors';
import { MAX_QUANTITY, VARIANT_ID_MAX_LENGTH } from '../constants/inventory.constants';

function validQuantity(value: number, minimum = 0): boolean {
  return Number.isSafeInteger(value) && value >= minimum && value <= MAX_QUANTITY;
}

// Domain Events
export class StockCreatedEvent extends DomainEvent {
  constructor(
    public readonly stockId: string,
    public readonly workspaceId: string,
    public readonly variantId: string,
    public readonly locationId: string
  ) {
    super(stockId, 'Stock');
  }

  get eventType(): string { return 'stock.created'; }

  getPayload(): Record<string, unknown> {
    return {
      stockId: this.stockId,
      workspaceId: this.workspaceId,
      variantId: this.variantId,
      locationId: this.locationId,
    };
  }
}

export class StockLevelChangedEvent extends DomainEvent {
  constructor(
    public readonly stockId: string,
    public readonly workspaceId: string,
    public readonly variantId: string,
    public readonly locationId: string,
    public readonly previousQuantity: number,
    public readonly newQuantity: number
  ) {
    super(stockId, 'Stock');
  }

  get eventType(): string { return 'stock.level_changed'; }

  getPayload(): Record<string, unknown> {
    return {
      stockId: this.stockId,
      workspaceId: this.workspaceId,
      variantId: this.variantId,
      locationId: this.locationId,
      previousQuantity: this.previousQuantity,
      newQuantity: this.newQuantity,
    };
  }
}

export class LowStockAlertEvent extends DomainEvent {
  constructor(
    public readonly stockId: string,
    public readonly workspaceId: string,
    public readonly variantId: string,
    public readonly locationId: string,
    public readonly currentQuantity: number,
    public readonly reorderLevel: number
  ) {
    super(stockId, 'Stock');
  }

  get eventType(): string { return 'stock.low_stock_alert'; }

  getPayload(): Record<string, unknown> {
    return {
      stockId: this.stockId,
      workspaceId: this.workspaceId,
      variantId: this.variantId,
      locationId: this.locationId,
      currentQuantity: this.currentQuantity,
      reorderLevel: this.reorderLevel,
    };
  }
}

export class StockUpdatedEvent extends DomainEvent {
  constructor(
    public readonly stockId: string,
    public readonly workspaceId: string,
    public readonly variantId: string,
    public readonly locationId: string,
    public readonly changes: Record<string, unknown>
  ) {
    super(stockId, 'Stock');
  }

  get eventType(): string { return 'stock.updated'; }

  getPayload(): Record<string, unknown> {
    return {
      stockId: this.stockId,
      workspaceId: this.workspaceId,
      variantId: this.variantId,
      locationId: this.locationId,
      changes: this.changes,
    };
  }
}

export interface StockProps {
  id: StockId;
  workspaceId: string;
  variantId: string;
  locationId: string;
  quantity: number;
  reservedQuantity: number;
  reorderLevel: number;
  reorderQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStockData {
  workspaceId: string;
  variantId: string;
  locationId: string;
  quantity?: number;
  reorderLevel?: number;
  reorderQuantity?: number;
}

export interface StockDTO {
  stockId: string;
  workspaceId: string;
  variantId: string;
  locationId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  reorderQuantity: number;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export class Stock extends AggregateRoot {
  private constructor(private props: StockProps) {
    super();
  }

  static create(data: CreateStockData): Stock {
    if (!UuidId.isValid(data.workspaceId) || !UuidId.isValid(data.locationId)) {
      throw new InvalidInventoryDataError('Invalid workspace or location ID');
    }
    if (!data.variantId?.trim() || data.variantId.length > VARIANT_ID_MAX_LENGTH) {
      throw new InvalidInventoryDataError('Invalid variant ID');
    }
    if (!validQuantity(data.quantity ?? 0) || !validQuantity(data.reorderLevel ?? 0) || !validQuantity(data.reorderQuantity ?? 0)) {
      throw new InvalidQuantityError('Stock quantities must be whole numbers within the allowed range');
    }
    const now = new Date();
    const stock = new Stock({
      id: StockId.create(),
      workspaceId: data.workspaceId,
      variantId: data.variantId,
      locationId: data.locationId,
      quantity: data.quantity ?? 0,
      reservedQuantity: 0,
      reorderLevel: data.reorderLevel ?? 0,
      reorderQuantity: data.reorderQuantity ?? 0,
      createdAt: now,
      updatedAt: now,
    });

    stock.addDomainEvent(
      new StockCreatedEvent(
        stock.id.getValue(),
        stock.workspaceId,
        stock.variantId,
        stock.locationId
      )
    );

    return stock;
  }

  static fromPersistence(props: StockProps): Stock {
    return new Stock({ ...props, createdAt: new Date(props.createdAt), updatedAt: new Date(props.updatedAt) });
  }

  private emitStockLevelChanged(previousQuantity: number): void {
    this.addDomainEvent(
      new StockLevelChangedEvent(
        this.id.getValue(),
        this.workspaceId,
        this.variantId,
        this.locationId,
        previousQuantity,
        this.props.quantity
      )
    );
    if (this.isLowStock() && (previousQuantity - this.props.reservedQuantity > this.props.reorderLevel)) {
      this.addDomainEvent(
        new LowStockAlertEvent(
          this.id.getValue(),
          this.workspaceId,
          this.variantId,
          this.locationId,
          this.getAvailableQuantity(),
          this.props.reorderLevel
        )
      );
    }
  }

  addQuantity(amount: number): void {
    if (!validQuantity(amount, 1) || !validQuantity(this.props.quantity + amount)) {
      throw new InvalidQuantityError('Amount to add must be greater than zero');
    }
    const prev = this.props.quantity;
    this.props.quantity += amount;
    this.props.updatedAt = new Date();
    this.emitStockLevelChanged(prev);
  }

  removeQuantity(amount: number): void {
    if (!validQuantity(amount, 1)) {
      throw new InvalidQuantityError('Amount to remove must be greater than zero');
    }
    const available = this.getAvailableQuantity();
    if (amount > available) {
      throw new InsufficientStockError(available, amount);
    }
    const prev = this.props.quantity;
    this.props.quantity -= amount;
    this.props.updatedAt = new Date();
    this.emitStockLevelChanged(prev);
  }

  reserve(amount: number): void {
    if (!validQuantity(amount, 1)) {
      throw new InvalidQuantityError('Reserve amount must be greater than zero');
    }
    const available = this.getAvailableQuantity();
    if (amount > available) {
      throw new InsufficientStockError(available, amount);
    }
    this.props.reservedQuantity += amount;
    this.props.updatedAt = new Date();
    if (this.isLowStock() && available > this.props.reorderLevel) {
      this.addDomainEvent(new LowStockAlertEvent(this.id.getValue(), this.workspaceId, this.variantId, this.locationId, this.getAvailableQuantity(), this.props.reorderLevel));
    }
  }

  releaseReservation(amount: number): void {
    if (!validQuantity(amount, 1) || amount > this.props.reservedQuantity) {
      throw new InvalidQuantityError('Release amount must be greater than zero');
    }
    this.props.reservedQuantity -= amount;
    this.props.updatedAt = new Date();
  }

  adjustQuantity(newQuantity: number): void {
    if (!validQuantity(newQuantity)) {
      throw new InvalidQuantityError('Quantity cannot be negative');
    }
    if (newQuantity < this.props.reservedQuantity) {
      throw new InsufficientStockError(this.getAvailableQuantity(), this.props.reservedQuantity - newQuantity);
    }
    if (newQuantity === this.props.quantity) return;
    const prev = this.props.quantity;
    this.props.quantity = newQuantity;
    this.props.updatedAt = new Date();
    this.emitStockLevelChanged(prev);
  }

  updateReorderLevel(level: number): void {
    if (!validQuantity(level)) {
      throw new InvalidQuantityError('Reorder level cannot be negative');
    }
    if (level === this.props.reorderLevel) return;
    const wasLow = this.isLowStock();
    this.props.reorderLevel = level;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new StockUpdatedEvent(
        this.id.getValue(),
        this.workspaceId,
        this.variantId,
        this.locationId,
        { reorderLevel: level }
      )
    );
    if (!wasLow && this.isLowStock()) {
      this.addDomainEvent(new LowStockAlertEvent(this.id.getValue(), this.workspaceId, this.variantId, this.locationId, this.getAvailableQuantity(), level));
    }
  }

  updateReorderQuantity(quantity: number): void {
    if (!validQuantity(quantity)) {
      throw new InvalidQuantityError('Reorder quantity cannot be negative');
    }
    if (quantity === this.props.reorderQuantity) return;
    this.props.reorderQuantity = quantity;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new StockUpdatedEvent(
        this.id.getValue(),
        this.workspaceId,
        this.variantId,
        this.locationId,
        { reorderQuantity: quantity }
      )
    );
  }

  getAvailableQuantity(): number {
    return this.props.quantity - this.props.reservedQuantity;
  }

  isLowStock(): boolean {
    return this.props.reorderLevel > 0 && this.getAvailableQuantity() <= this.props.reorderLevel;
  }

  get id(): StockId { return this.props.id; }
  get workspaceId(): string { return this.props.workspaceId; }
  get variantId(): string { return this.props.variantId; }
  get locationId(): string { return this.props.locationId; }
  get quantity(): number { return this.props.quantity; }
  get reservedQuantity(): number { return this.props.reservedQuantity; }
  get reorderLevel(): number { return this.props.reorderLevel; }
  get reorderQuantity(): number { return this.props.reorderQuantity; }
  get createdAt(): Date { return new Date(this.props.createdAt); }
  get updatedAt(): Date { return new Date(this.props.updatedAt); }

  equals(other: Stock): boolean {
    return this.props.id.equals(other.props.id);
  }

  static toDTO(stock: Stock): StockDTO {
    return {
      stockId: stock.id.getValue(),
      workspaceId: stock.workspaceId,
      variantId: stock.variantId,
      locationId: stock.locationId,
      quantity: stock.quantity,
      reservedQuantity: stock.reservedQuantity,
      availableQuantity: stock.getAvailableQuantity(),
      reorderLevel: stock.reorderLevel,
      reorderQuantity: stock.reorderQuantity,
      isLowStock: stock.isLowStock(),
      createdAt: stock.createdAt.toISOString(),
      updatedAt: stock.updatedAt.toISOString(),
    };
  }
}
