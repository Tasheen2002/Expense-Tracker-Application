import { randomUUID } from "crypto";
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class RuleExecutionId extends UuidId {
  declare private readonly nominalBrand: RuleExecutionId;
  private constructor(value: string) {
    super(value, "RuleExecutionId");
    Object.freeze(this);
  }

  static create(): RuleExecutionId {
    return new RuleExecutionId(randomUUID());
  }

  static fromString(id: string): RuleExecutionId {
    return new RuleExecutionId(id);
  }
}
