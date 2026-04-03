import { randomUUID } from "crypto";
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class InvitationId extends UuidId {
  private constructor(value: string) {
    super(value, "InvitationId");
  }

  static create(): InvitationId {
    return new InvitationId(randomUUID());
  }

  static fromString(id: string): InvitationId {
    return new InvitationId(id);
  }
}
