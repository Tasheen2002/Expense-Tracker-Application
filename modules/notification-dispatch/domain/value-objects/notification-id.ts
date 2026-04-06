import { randomUUID } from "crypto";
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

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
