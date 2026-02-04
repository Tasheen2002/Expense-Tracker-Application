import { v4 as uuidv4 } from "uuid";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects/uuid-id.base";

export class OutboxEventId extends UuidId {
  constructor(value: string) {
    super(value, "OutboxEventId");
  }

  static create(): OutboxEventId {
    return new OutboxEventId(uuidv4());
  }

  static fromString(id: string): OutboxEventId {
    return new OutboxEventId(id);
  }
}
