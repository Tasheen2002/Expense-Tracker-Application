import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

export class ViolationId extends UuidId {
  private constructor(value: string) {
    super(value, "ViolationId");
  }

  static create(): ViolationId {
    return new ViolationId(randomUUID());
  }

  static fromString(id: string): ViolationId {
    return new ViolationId(id);
  }
}
