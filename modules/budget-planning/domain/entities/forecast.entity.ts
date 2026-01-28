import { ForecastId } from "../value-objects/forecast-id";
import { PlanId } from "../value-objects/plan-id";
import { ForecastType } from "../enums/forecast-type.enum";

export class Forecast {
  private constructor(
    private readonly id: ForecastId,
    private readonly planId: PlanId,
    private name: string,
    private readonly type: ForecastType,
    private isActive: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(params: {
    planId: PlanId;
    name: string;
    type: ForecastType;
  }): Forecast {
    return new Forecast(
      ForecastId.create(),
      params.planId,
      params.name,
      params.type,
      true,
      new Date(),
      new Date(),
    );
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
  }

  activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }
}
