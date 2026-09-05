import { randomUUID } from "crypto";
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class ForecastId extends UuidId {
  private constructor(value: string) {
    super(value, "ForecastId");
  }

  static create(): ForecastId {
    return new ForecastId(randomUUID());
  }

  static fromString(id: string): ForecastId {
    return new ForecastId(id);
  }
}
