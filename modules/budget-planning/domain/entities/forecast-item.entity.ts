import { ForecastItemId } from '../value-objects/forecast-item-id';
import { ForecastId } from '../value-objects/forecast-id';
import { CategoryId } from '../../../expense-ledger/domain/value-objects/category-id';
import { ForecastAmount } from '../value-objects/forecast-amount';
import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';

// ============================================================================
// Domain Events
// ============================================================================

export class ForecastItemCreatedEvent extends DomainEvent {
  constructor(
    public readonly forecastItemId: string,
    public readonly forecastId: string,
    public readonly categoryId: string,
    public readonly amount: string
  ) {
    super(forecastItemId, 'ForecastItem');
  }

  get eventType(): string {
    return 'ForecastItemCreated';
  }

  getPayload(): Record<string, unknown> {
    return {
      forecastItemId: this.forecastItemId,
      forecastId: this.forecastId,
      categoryId: this.categoryId,
      amount: this.amount,
    };
  }
}

export class ForecastItemUpdatedEvent extends DomainEvent {
  constructor(
    public readonly forecastItemId: string,
    public readonly changes: Record<string, unknown>
  ) {
    super(forecastItemId, 'ForecastItem');
  }

  get eventType(): string {
    return 'ForecastItemUpdated';
  }

  getPayload(): Record<string, unknown> {
    return {
      forecastItemId: this.forecastItemId,
      changes: this.changes,
    };
  }
}

// ============================================================================
// Entity
// ============================================================================

export class ForecastItem extends AggregateRoot {
  private constructor(
    private readonly _id: ForecastItemId,
    private readonly _forecastId: ForecastId,
    private readonly _categoryId: CategoryId,
    private _amount: ForecastAmount,
    private _notes: string | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {
    super();
  }

  static create(params: {
    forecastId: ForecastId;
    categoryId: CategoryId;
    amount: ForecastAmount;
    notes?: string | null;
  }): ForecastItem {
    const item = new ForecastItem(
      ForecastItemId.create(),
      params.forecastId,
      params.categoryId,
      params.amount,
      params.notes || null,
      new Date(),
      new Date()
    );

    item.addDomainEvent(
      new ForecastItemCreatedEvent(
        item._id.getValue(),
        params.forecastId.getValue(),
        params.categoryId.getValue(),
        params.amount.getValue().toString()
      )
    );

    return item;
  }

  static reconstitute(params: {
    id: string;
    forecastId: string;
    categoryId: string;
    amount: number | string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ForecastItem {
    return new ForecastItem(
      ForecastItemId.fromString(params.id),
      ForecastId.fromString(params.forecastId),
      CategoryId.fromString(params.categoryId),
      ForecastAmount.create(params.amount),
      params.notes,
      params.createdAt,
      params.updatedAt
    );
  }

  get id(): ForecastItemId {
    return this._id;
  }

  get forecastId(): ForecastId {
    return this._forecastId;
  }

  get categoryId(): CategoryId {
    return this._categoryId;
  }

  get amount(): ForecastAmount {
    return this._amount;
  }

  get notes(): string | null {
    return this._notes;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateDetails(amount?: ForecastAmount, notes?: string | null): void {
    const changes: Record<string, unknown> = {};
    if (amount) {
      this._amount = amount;
      changes.amount = amount.getValue().toString();
    }
    if (notes !== undefined) {
      this._notes = notes;
      changes.notes = notes;
    }
    this._updatedAt = new Date();

    if (Object.keys(changes).length > 0) {
      this.addDomainEvent(
        new ForecastItemUpdatedEvent(this._id.getValue(), changes)
      );
    }
  }

  static toDTO(item: ForecastItem): ForecastItemDTO {
    return {
      id: item.id.getValue(),
      forecastId: item.forecastId.getValue(),
      categoryId: item.categoryId.getValue(),
      amount: item.amount.toNumber(),
      notes: item.notes,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

export interface ForecastItemDTO {
  id: string;
  forecastId: string;
  categoryId: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
