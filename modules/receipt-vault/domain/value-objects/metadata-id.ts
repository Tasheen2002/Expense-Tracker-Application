import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

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
