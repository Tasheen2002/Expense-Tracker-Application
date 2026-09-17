import { randomUUID } from "crypto";
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class PlanId extends UuidId {
  private constructor(value: string) {
    super(value, "PlanId");
  }

  static create(): PlanId {
    return new PlanId(randomUUID());
  }

  static fromString(id: string): PlanId {
    return new PlanId(id);
  }
}
