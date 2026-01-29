import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

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
