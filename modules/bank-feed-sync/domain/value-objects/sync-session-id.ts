import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

export class SyncSessionId extends UuidId {
  private constructor(value: string) {
    super(value, "SyncSessionId");
  }

  static create(): SyncSessionId {
    return new SyncSessionId(randomUUID());
  }

  static fromString(id: string): SyncSessionId {
    return new SyncSessionId(id);
  }
}
