import { ForecastItemId } from '../value-objects/forecast-item-id';
import { ForecastId } from '../value-objects/forecast-id';
import { CategoryId } from '../../../expense-ledger';
import { ForecastAmount } from '../value-objects/forecast-amount';

// ============================================================================
// Entity
// ============================================================================

export interface ForecastItemDTO {
  id: string;
  forecastId: string;
  categoryId: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ForecastItemProps {
  id: ForecastItemId;
  forecastId: ForecastId;
  categoryId: CategoryId;
  amount: ForecastAmount;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ForecastItem {
  private constructor(private props: ForecastItemProps) {}

  static create(params: {
    forecastId: ForecastId;
    categoryId: CategoryId;
    amount: ForecastAmount;
    notes?: string | null;
  }): ForecastItem {
    return new ForecastItem({
      id: ForecastItemId.create(),
      forecastId: params.forecastId,
      categoryId: params.categoryId,
      amount: params.amount,
      notes: params.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
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
    return new ForecastItem({
      id: ForecastItemId.fromString(params.id),
      forecastId: ForecastId.fromString(params.forecastId),
      categoryId: CategoryId.fromString(params.categoryId),
      amount: ForecastAmount.create(params.amount),
      notes: params.notes,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    });
  }

  get id(): ForecastItemId { return this.props.id; }
  get forecastId(): ForecastId { return this.props.forecastId; }
  get categoryId(): CategoryId { return this.props.categoryId; }
  get amount(): ForecastAmount { return this.props.amount; }
  get notes(): string | null { return this.props.notes; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  updateDetails(amount?: ForecastAmount, notes?: string | null): void {
    if (amount) this.props.amount = amount;
    if (notes !== undefined) this.props.notes = notes;
    this.props.updatedAt = new Date();
  }

  static toDTO(item: ForecastItem): ForecastItemDTO {
    return {
      id: item.props.id.getValue(),
      forecastId: item.props.forecastId.getValue(),
      categoryId: item.props.categoryId.getValue(),
      amount: item.props.amount.toNumber(),
      notes: item.props.notes,
      createdAt: item.props.createdAt.toISOString(),
      updatedAt: item.props.updatedAt.toISOString(),
    };
  }
}
