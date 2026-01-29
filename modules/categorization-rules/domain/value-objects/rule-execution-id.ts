import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

export class RuleExecutionId extends UuidId {
  private constructor(value: string) {
    super(value, "RuleExecutionId");
  }

  static create(): RuleExecutionId {
    return new RuleExecutionId(randomUUID());
  }

  static fromString(id: string): RuleExecutionId {
    return new RuleExecutionId(id);
  }
}
