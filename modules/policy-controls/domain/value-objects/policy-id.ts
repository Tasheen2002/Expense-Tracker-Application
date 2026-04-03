import { randomUUID } from "crypto";
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class PolicyId extends UuidId {
  private constructor(value: string) {
    super(value, "PolicyId");
  }

  static create(): PolicyId {
    return new PolicyId(randomUUID());
  }

  static fromString(id: string): PolicyId {
    return new PolicyId(id);
  }
}
