import { ForecastId } from '../value-objects/forecast-id';
import { PlanId } from '../value-objects/plan-id';
import { WorkspaceId } from '@core/domain/value-objects';
import { ForecastType } from '../enums/forecast-type.enum';
import { ValidationError } from '../errors/budget-planning.errors';
import { PLANNING_CONSTANTS } from '../constants/planning.constants';

// ============================================================================
// Entity
// ============================================================================

export interface ForecastDTO {
  id: string;
  workspaceId: string;
  planId: string;
  name: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ForecastProps {
  id: ForecastId;
  workspaceId: WorkspaceId;
  planId: PlanId;
  name: string;
  type: ForecastType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Forecast {
  private constructor(private props: ForecastProps) {}

  static create(params: {
    workspaceId: WorkspaceId;
    planId: PlanId;
    name: string;
    type: ForecastType;
  }): Forecast {
    const trimmedName = params.name ? params.name.trim() : '';
    if (
      trimmedName.length < PLANNING_CONSTANTS.NAME_MIN_LENGTH ||
      trimmedName.length > PLANNING_CONSTANTS.FORECAST_NAME_MAX_LENGTH
    ) {
      throw new ValidationError(
        `Forecast name must be between ${PLANNING_CONSTANTS.NAME_MIN_LENGTH} and ${PLANNING_CONSTANTS.FORECAST_NAME_MAX_LENGTH} characters`
      );
    }

    return new Forecast({
      id: ForecastId.create(),
      workspaceId: params.workspaceId,
      planId: params.planId,
      name: trimmedName,
      type: params.type,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(params: {
    id: string;
    workspaceId: string;
    planId: string;
    name: string;
    type: ForecastType;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Forecast {
    return new Forecast({
      id: ForecastId.fromString(params.id),
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      planId: PlanId.fromString(params.planId),
      name: params.name,
      type: params.type,
      isActive: params.isActive,
      createdAt: new Date(params.createdAt.getTime()),
      updatedAt: new Date(params.updatedAt.getTime()),
    });
  }

  get id(): ForecastId { return this.props.id; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get planId(): PlanId { return this.props.planId; }
  get name(): string { return this.props.name; }
  get type(): ForecastType { return this.props.type; }
  get active(): boolean { return this.props.isActive; }
  get createdAt(): Date { return new Date(this.props.createdAt.getTime()); }
  get updatedAt(): Date { return new Date(this.props.updatedAt.getTime()); }

  updateName(name: string): void {
    const trimmedName = name ? name.trim() : '';
    if (
      trimmedName.length < PLANNING_CONSTANTS.NAME_MIN_LENGTH ||
      trimmedName.length > PLANNING_CONSTANTS.FORECAST_NAME_MAX_LENGTH
    ) {
      throw new ValidationError(
        `Forecast name must be between ${PLANNING_CONSTANTS.NAME_MIN_LENGTH} and ${PLANNING_CONSTANTS.FORECAST_NAME_MAX_LENGTH} characters`
      );
    }
    this.props.name = trimmedName;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    if (this.props.isActive) return;
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    if (!this.props.isActive) return;
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  static toDTO(forecast: Forecast): ForecastDTO {
    return {
      id: forecast.props.id.getValue(),
      workspaceId: forecast.props.workspaceId.getValue(),
      planId: forecast.props.planId.getValue(),
      name: forecast.props.name,
      type: forecast.props.type,
      isActive: forecast.props.isActive,
      createdAt: forecast.props.createdAt.toISOString(),
      updatedAt: forecast.props.updatedAt.toISOString(),
    };
  }
}
