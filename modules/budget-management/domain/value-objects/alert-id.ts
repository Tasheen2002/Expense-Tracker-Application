import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

export class AlertId extends UuidId {
  private constructor(value: string) {
    super(value, "AlertId");
  }

  static create(): AlertId {
    return new AlertId(randomUUID());
  }

  static fromString(value: string): AlertId {
    return new AlertId(value);
  }
}
