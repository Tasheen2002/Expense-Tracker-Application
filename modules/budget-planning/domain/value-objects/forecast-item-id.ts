import { randomUUID } from "crypto";
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class ForecastItemId extends UuidId {
  private constructor(value: string) {
    super(value, "ForecastItemId");
  }

  static create(): ForecastItemId {
    return new ForecastItemId(randomUUID());
  }

  static fromString(id: string): ForecastItemId {
    return new ForecastItemId(id);
  }
}
