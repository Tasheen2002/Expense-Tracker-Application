import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

export class RuleId extends UuidId {
  private constructor(value: string) {
    super(value, "RuleId");
  }

  static create(): RuleId {
    return new RuleId(randomUUID());
  }

  static fromString(id: string): RuleId {
    return new RuleId(id);
  }
}
