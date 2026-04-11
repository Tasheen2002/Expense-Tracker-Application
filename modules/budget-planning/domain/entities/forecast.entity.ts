import { ForecastId } from '../value-objects/forecast-id';
import { PlanId } from '../value-objects/plan-id';
import { ForecastType } from '../enums/forecast-type.enum';

// ============================================================================
// Entity
// ============================================================================

interface ForecastProps {
  id: ForecastId;
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
    planId: PlanId;
    name: string;
    type: ForecastType;
  }): Forecast {
    return new Forecast({
      id: ForecastId.create(),
      planId: params.planId,
      name: params.name,
      type: params.type,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(params: {
    id: string;
    planId: string;
    name: string;
    type: ForecastType;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Forecast {
    return new Forecast({
      id: ForecastId.fromString(params.id),
      planId: PlanId.fromString(params.planId),
      name: params.name,
      type: params.type,
      isActive: params.isActive,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    });
  }

  get id(): ForecastId { return this.props.id; }
  get planId(): PlanId { return this.props.planId; }
  get name(): string { return this.props.name; }
  get type(): ForecastType { return this.props.type; }
  get active(): boolean { return this.props.isActive; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  updateName(name: string): void {
    this.props.name = name;
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
      planId: forecast.props.planId.getValue(),
      name: forecast.props.name,
      type: forecast.props.type,
      isActive: forecast.props.isActive,
      createdAt: forecast.props.createdAt.toISOString(),
      updatedAt: forecast.props.updatedAt.toISOString(),
    };
  }
}

export interface ForecastDTO {
  id: string;
  planId: string;
  name: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
