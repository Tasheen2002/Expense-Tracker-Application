import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

export class AllocationId extends UuidId {
  private constructor(value: string) {
    super(value, "AllocationId");
  }

  static create(): AllocationId {
    return new AllocationId(randomUUID());
  }

  static fromString(id: string): AllocationId {
    return new AllocationId(id);
  }
}
