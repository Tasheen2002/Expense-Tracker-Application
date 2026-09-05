import { randomUUID } from "crypto";
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

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
