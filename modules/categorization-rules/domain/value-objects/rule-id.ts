import { randomUUID } from "crypto";
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

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
