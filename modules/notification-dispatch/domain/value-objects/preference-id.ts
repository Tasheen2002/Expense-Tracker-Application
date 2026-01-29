import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

export class PreferenceId extends UuidId {
  private constructor(value: string) {
    super(value, "PreferenceId");
  }

  static create(): PreferenceId {
    return new PreferenceId(randomUUID());
  }

  static fromString(id: string): PreferenceId {
    return new PreferenceId(id);
  }
}
