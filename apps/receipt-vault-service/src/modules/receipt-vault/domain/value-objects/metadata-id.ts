import { randomUUID } from "crypto";
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class MetadataId extends UuidId {
  private constructor(value: string) {
    super(value, "MetadataId");
  }

  static create(): MetadataId {
    return new MetadataId(randomUUID());
  }

  static fromString(id: string): MetadataId {
    return new MetadataId(id);
  }
}
