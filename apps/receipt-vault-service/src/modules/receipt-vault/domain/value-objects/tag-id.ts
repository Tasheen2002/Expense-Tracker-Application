import { randomUUID } from "crypto";
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class TagId extends UuidId {
  private constructor(value: string) {
    super(value, "TagId");
  }

  static create(): TagId {
    return new TagId(randomUUID());
  }

  static fromString(id: string): TagId {
    return new TagId(id);
  }
}
