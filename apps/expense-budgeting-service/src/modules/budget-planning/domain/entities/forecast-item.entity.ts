import { ForecastItemId } from '../value-objects/forecast-item-id';
import { ForecastId } from '../value-objects/forecast-id';
import { CategoryId, WorkspaceId } from '@core/domain/value-objects';
import { ForecastAmount } from '../value-objects/forecast-amount';
import { ValidationError } from '../errors/budget-planning.errors';
import { PLANNING_CONSTANTS } from '../constants/planning.constants';

// ============================================================================
// Entity
// ============================================================================

export interface ForecastItemDTO {
  id: string;
  workspaceId: string;
  forecastId: string;
  categoryId: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ForecastItemProps {
  id: ForecastItemId;
  workspaceId: WorkspaceId;
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
    workspaceId: WorkspaceId;
    forecastId: ForecastId;
    categoryId: CategoryId;
    amount: ForecastAmount;
    notes?: string | null;
  }): ForecastItem {
    const trimmedNotes =
      params.notes !== undefined && params.notes !== null
        ? params.notes.trim()
        : null;
    if (trimmedNotes && trimmedNotes.length > PLANNING_CONSTANTS.NOTES_MAX_LENGTH) {
      throw new ValidationError(
        `Notes cannot exceed ${PLANNING_CONSTANTS.NOTES_MAX_LENGTH} characters`
      );
    }

    return new ForecastItem({
      id: ForecastItemId.create(),
      workspaceId: params.workspaceId,
      forecastId: params.forecastId,
      categoryId: params.categoryId,
      amount: params.amount,
      notes: trimmedNotes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(params: {
    id: string;
    workspaceId: string;
    forecastId: string;
    categoryId: string;
    amount: number | string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ForecastItem {
    return new ForecastItem({
      id: ForecastItemId.fromString(params.id),
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      forecastId: ForecastId.fromString(params.forecastId),
      categoryId: CategoryId.fromString(params.categoryId),
      amount: ForecastAmount.create(params.amount),
      notes: params.notes,
      createdAt: new Date(params.createdAt.getTime()),
      updatedAt: new Date(params.updatedAt.getTime()),
    });
  }

  get id(): ForecastItemId { return this.props.id; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get forecastId(): ForecastId { return this.props.forecastId; }
  get categoryId(): CategoryId { return this.props.categoryId; }
  get amount(): ForecastAmount { return this.props.amount; }
  get notes(): string | null { return this.props.notes; }
  get createdAt(): Date { return new Date(this.props.createdAt.getTime()); }
  get updatedAt(): Date { return new Date(this.props.updatedAt.getTime()); }

  updateDetails(amount?: ForecastAmount, notes?: string | null): void {
    let validatedNotes = this.props.notes;
    if (notes !== undefined) {
      const trimmedNotes = notes !== null ? notes.trim() : null;
      if (trimmedNotes && trimmedNotes.length > PLANNING_CONSTANTS.NOTES_MAX_LENGTH) {
        throw new ValidationError(
          `Notes cannot exceed ${PLANNING_CONSTANTS.NOTES_MAX_LENGTH} characters`
        );
      }
      validatedNotes = trimmedNotes || null;
    }

    if (amount) this.props.amount = amount;
    if (notes !== undefined) this.props.notes = validatedNotes;
    this.props.updatedAt = new Date();
  }

  static toDTO(item: ForecastItem): ForecastItemDTO {
    return {
      id: item.props.id.getValue(),
      workspaceId: item.props.workspaceId.getValue(),
      forecastId: item.props.forecastId.getValue(),
      categoryId: item.props.categoryId.getValue(),
      amount: item.props.amount.toNumber(),
      notes: item.props.notes,
      createdAt: item.props.createdAt.toISOString(),
      updatedAt: item.props.updatedAt.toISOString(),
    };
  }
}
