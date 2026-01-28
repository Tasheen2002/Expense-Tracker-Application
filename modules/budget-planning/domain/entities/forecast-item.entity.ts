import { ForecastItemId } from "../value-objects/forecast-item-id";
import { ForecastId } from "../value-objects/forecast-id";
import { CategoryId } from "../../../expense-ledger/domain/value-objects/category-id";
import { ForecastAmount } from "../value-objects/forecast-amount";

export class ForecastItem {
  private constructor(
    private readonly id: ForecastItemId,
    private readonly forecastId: ForecastId,
    private readonly categoryId: CategoryId,
    private amount: ForecastAmount,
    private notes: string | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(params: {
    forecastId: ForecastId;
    categoryId: CategoryId;
    amount: ForecastAmount;
    notes?: string | null;
  }): ForecastItem {
    return new ForecastItem(
      ForecastItemId.create(),
      params.forecastId,
      params.categoryId,
      params.amount,
      params.notes || null,
      new Date(),
      new Date(),
    );
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
    if (amount) this.amount = amount;
    if (notes !== undefined) this.notes = notes;
    this.updatedAt = new Date();
  }
}
