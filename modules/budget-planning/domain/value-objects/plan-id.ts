import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

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
