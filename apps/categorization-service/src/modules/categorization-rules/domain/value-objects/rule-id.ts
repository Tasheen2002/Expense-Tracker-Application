import { randomUUID } from "crypto";
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class RuleId extends UuidId {
  declare private readonly nominalBrand: RuleId;
  private constructor(value: string) {
    super(value, "RuleId");
    Object.freeze(this);
  }

  static create(): RuleId {
    return new RuleId(randomUUID());
  }

  static fromString(id: string): RuleId {
    return new RuleId(id);
  }
}
