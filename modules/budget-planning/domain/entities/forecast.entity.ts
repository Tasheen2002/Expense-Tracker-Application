import { ForecastId } from '../value-objects/forecast-id';
import { PlanId } from '../value-objects/plan-id';
import { ForecastType } from '../enums/forecast-type.enum';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';

// ============================================================================
// Domain Events
// ============================================================================

export class ForecastCreatedEvent extends DomainEvent {
  constructor(
    public readonly forecastId: string,
    public readonly planId: string,
    public readonly name: string,
    public readonly type: ForecastType
  ) {
    super(forecastId, 'Forecast');
  }

  get eventType(): string {
    return 'ForecastCreated';
  }

  getPayload(): Record<string, unknown> {
    return {
      forecastId: this.forecastId,
      planId: this.planId,
      name: this.name,
      type: this.type,
    };
  }
}

export class ForecastNameUpdatedEvent extends DomainEvent {
  constructor(
    public readonly forecastId: string,
    public readonly newName: string
  ) {
    super(forecastId, 'Forecast');
  }

  get eventType(): string {
    return 'ForecastNameUpdated';
  }

  getPayload(): Record<string, unknown> {
    return {
      forecastId: this.forecastId,
      newName: this.newName,
    };
  }
}

export class ForecastActivatedEvent extends DomainEvent {
  constructor(public readonly forecastId: string) {
    super(forecastId, 'Forecast');
  }

  get eventType(): string {
    return 'ForecastActivated';
  }

  getPayload(): Record<string, unknown> {
    return { forecastId: this.forecastId };
  }
}

export class ForecastDeactivatedEvent extends DomainEvent {
  constructor(public readonly forecastId: string) {
    super(forecastId, 'Forecast');
  }

  get eventType(): string {
    return 'ForecastDeactivated';
  }

  getPayload(): Record<string, unknown> {
    return { forecastId: this.forecastId };
  }
}

// ============================================================================
// Entity
// ============================================================================

export class Forecast {
  private constructor(
    private readonly _id: ForecastId,
    private readonly _planId: PlanId,
    private _name: string,
    private readonly _type: ForecastType,
    private _isActive: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  static create(params: {
    planId: PlanId;
    name: string;
    type: ForecastType;
  }): Forecast {
    const forecast = new Forecast(
      ForecastId.create(),
      params.planId,
      params.name,
      params.type,
      true,
      new Date(),
      new Date()
    );

    return forecast;
  }

  static reconstitute(params: {
    id: string;
    planId: string;
    name: string;
    type: ForecastType;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Forecast {
    return new Forecast(
      ForecastId.fromString(params.id),
      PlanId.fromString(params.planId),
      params.name,
      params.type,
      params.isActive,
      params.createdAt,
      params.updatedAt
    );
  }

  get id(): ForecastId {
    return this._id;
  }

  get planId(): PlanId {
    return this._planId;
  }

  get name(): string {
    return this._name;
  }

  get type(): ForecastType {
    return this._type;
  }

  get active(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateName(name: string): void {
    this._name = name;
    this._updatedAt = new Date();
  }

  activate(): void {
    if (this._isActive) return;
    this._isActive = true;
    this._updatedAt = new Date();
  }

  deactivate(): void {
    if (!this._isActive) return;
    this._isActive = false;
    this._updatedAt = new Date();
  }

  static toDTO(forecast: Forecast): ForecastDTO {
    return {
      id: forecast.id.getValue(),
      planId: forecast.planId.getValue(),
      name: forecast.name,
      type: forecast.type,
      isActive: forecast.active,
      createdAt: forecast.createdAt.toISOString(),
      updatedAt: forecast.updatedAt.toISOString(),
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
