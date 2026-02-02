import { ForecastId } from "../value-objects/forecast-id";
import { PlanId } from "../value-objects/plan-id";
import { ForecastType } from "../enums/forecast-type.enum";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events/domain-event";

// ============================================================================
// Domain Events
// ============================================================================

export class ForecastCreatedEvent extends DomainEvent {
  constructor(
    public readonly forecastId: string,
    public readonly planId: string,
    public readonly name: string,
    public readonly type: ForecastType,
  ) {
    super(forecastId, "Forecast");
  }

  get eventType(): string {
    return "ForecastCreated";
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
    public readonly newName: string,
  ) {
    super(forecastId, "Forecast");
  }

  get eventType(): string {
    return "ForecastNameUpdated";
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
    super(forecastId, "Forecast");
  }

  get eventType(): string {
    return "ForecastActivated";
  }

  getPayload(): Record<string, unknown> {
    return { forecastId: this.forecastId };
  }
}

export class ForecastDeactivatedEvent extends DomainEvent {
  constructor(public readonly forecastId: string) {
    super(forecastId, "Forecast");
  }

  get eventType(): string {
    return "ForecastDeactivated";
  }

  getPayload(): Record<string, unknown> {
    return { forecastId: this.forecastId };
  }
}

// ============================================================================
// Entity
// ============================================================================

export class Forecast extends AggregateRoot {
  private constructor(
    private readonly id: ForecastId,
    private readonly planId: PlanId,
    private name: string,
    private readonly type: ForecastType,
    private isActive: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

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
      new Date(),
    );

    forecast.addDomainEvent(
      new ForecastCreatedEvent(
        forecast.id.getValue(),
        params.planId.getValue(),
        params.name,
        params.type,
      ),
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
      params.updatedAt,
    );
  }

  getId(): ForecastId {
    return this.id;
  }

  getPlanId(): PlanId {
    return this.planId;
  }

  getName(): string {
    return this.name;
  }

  getType(): ForecastType {
    return this.type;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  updateName(name: string): void {
    this.name = name;
    this.updatedAt = new Date();
    this.addDomainEvent(new ForecastNameUpdatedEvent(this.id.getValue(), name));
  }

  activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.updatedAt = new Date();
    this.addDomainEvent(new ForecastActivatedEvent(this.id.getValue()));
  }

  deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.updatedAt = new Date();
    this.addDomainEvent(new ForecastDeactivatedEvent(this.id.getValue()));
  }
}
