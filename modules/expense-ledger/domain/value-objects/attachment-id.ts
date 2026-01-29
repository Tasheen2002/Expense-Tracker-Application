import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

export class AttachmentId extends UuidId {
  private constructor(value: string) {
    super(value, "AttachmentId");
  }

  static create(): AttachmentId {
    return new AttachmentId(randomUUID());
  }

  static fromString(id: string): AttachmentId {
    return new AttachmentId(id);
  }
}
