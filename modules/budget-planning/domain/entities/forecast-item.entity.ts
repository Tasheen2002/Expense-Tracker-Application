import { ForecastItemId } from "../value-objects/forecast-item-id";
import { ForecastId } from "../value-objects/forecast-id";
import { CategoryId } from "../../../expense-ledger/domain/value-objects/category-id";
import { ForecastAmount } from "../value-objects/forecast-amount";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events/domain-event";

// ============================================================================
// Domain Events
// ============================================================================

export class ForecastItemCreatedEvent extends DomainEvent {
  constructor(
    public readonly forecastItemId: string,
    public readonly forecastId: string,
    public readonly categoryId: string,
    public readonly amount: string,
  ) {
    super(forecastItemId, "ForecastItem");
  }

  get eventType(): string {
    return "ForecastItemCreated";
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
    public readonly changes: Record<string, unknown>,
  ) {
    super(forecastItemId, "ForecastItem");
  }

  get eventType(): string {
    return "ForecastItemUpdated";
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
    private readonly id: ForecastItemId,
    private readonly forecastId: ForecastId,
    private readonly categoryId: CategoryId,
    private amount: ForecastAmount,
    private notes: string | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
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
      new Date(),
    );

    item.addDomainEvent(
      new ForecastItemCreatedEvent(
        item.id.getValue(),
        params.forecastId.getValue(),
        params.categoryId.getValue(),
        params.amount.getValue().toString(),
      ),
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
      params.updatedAt,
    );
  }

  getId(): ForecastItemId {
    return this.id;
  }

  getForecastId(): ForecastId {
    return this.forecastId;
  }

  getCategoryId(): CategoryId {
    return this.categoryId;
  }

  getAmount(): ForecastAmount {
    return this.amount;
  }

  getNotes(): string | null {
    return this.notes;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  updateDetails(amount?: ForecastAmount, notes?: string | null): void {
    const changes: Record<string, unknown> = {};
    if (amount) {
      this.amount = amount;
      changes.amount = amount.getValue().toString();
    }
    if (notes !== undefined) {
      this.notes = notes;
      changes.notes = notes;
    }
    this.updatedAt = new Date();

    if (Object.keys(changes).length > 0) {
      this.addDomainEvent(
        new ForecastItemUpdatedEvent(this.id.getValue(), changes),
      );
    }
  }
}
