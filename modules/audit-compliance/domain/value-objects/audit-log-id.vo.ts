import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects/uuid-id.base";
import { randomUUID } from "crypto";

export class AuditLogId extends UuidId {
  protected constructor(value: string) {
    super(value, "AuditLogId");
  }

  static create(): AuditLogId {
    return new AuditLogId(randomUUID());
  }

  static fromString(id: string): AuditLogId {
    return new AuditLogId(id);
  }
}
