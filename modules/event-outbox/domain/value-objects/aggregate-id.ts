import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects/uuid-id.base";
import { v4 as uuidv4 } from "uuid";

export class AggregateId extends UuidId {
  constructor(value: string) {
    super(value, "AggregateId");
  }

  static create(): AggregateId {
    return new AggregateId(uuidv4());
  }

  static fromString(value: string): AggregateId {
    return new AggregateId(value);
  }
}
