import { randomUUID } from "crypto";
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class MembershipId extends UuidId {
  private constructor(value: string) {
    super(value, "MembershipId");
  }

  static create(): MembershipId {
    return new MembershipId(randomUUID());
  }

  static fromString(id: string): MembershipId {
    return new MembershipId(id);
  }
}
