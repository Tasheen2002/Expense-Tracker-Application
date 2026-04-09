import { ForecastItemId } from '../value-objects/forecast-item-id';
import { ForecastId } from '../value-objects/forecast-id';
import { CategoryId } from '../../../expense-ledger';
import { ForecastAmount } from '../value-objects/forecast-amount';

// ============================================================================
// Entity
// ============================================================================

export class ForecastItem {
  private constructor(
    private readonly _id: ForecastItemId,
    private readonly _forecastId: ForecastId,
    private readonly _categoryId: CategoryId,
    private _amount: ForecastAmount,
    private _notes: string | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

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

    return item;
  }

  static fromPersistence(params: {
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
