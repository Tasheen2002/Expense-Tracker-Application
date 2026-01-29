import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

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
