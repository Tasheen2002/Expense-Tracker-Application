import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

export class WorkspaceId extends UuidId {
  private constructor(value: string) {
    super(value, "WorkspaceId");
  }

  static create(): WorkspaceId {
    return new WorkspaceId(randomUUID());
  }

  static fromString(value: string): WorkspaceId {
    return new WorkspaceId(value);
  }
}
