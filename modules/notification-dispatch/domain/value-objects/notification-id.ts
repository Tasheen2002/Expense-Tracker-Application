import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

export class NotificationId extends UuidId {
  private constructor(value: string) {
    super(value, "NotificationId");
  }

  static create(): NotificationId {
    return new NotificationId(randomUUID());
  }

  static fromString(id: string): NotificationId {
    return new NotificationId(id);
  }
}
