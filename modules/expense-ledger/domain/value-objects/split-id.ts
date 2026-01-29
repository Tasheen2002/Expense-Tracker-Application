import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

export class SplitId extends UuidId {
  private constructor(value: string) {
    super(value, "SplitId");
  }

  static create(): SplitId {
    return new SplitId(randomUUID());
  }

  static fromString(id: string): SplitId {
    return new SplitId(id);
  }
}
