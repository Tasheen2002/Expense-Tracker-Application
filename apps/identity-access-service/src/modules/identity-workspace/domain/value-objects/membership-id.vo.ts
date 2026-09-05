import { randomUUID } from "crypto";
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class MembershipId extends UuidId {
  private constructor(value: string) {
    super(value, "MembershipId");
  }

  static create(): MembershipId {
    return new MembershipId(randomUUID());
  }

  static fromString(value: string): MembershipId {
    return new MembershipId(value);
  }
}
