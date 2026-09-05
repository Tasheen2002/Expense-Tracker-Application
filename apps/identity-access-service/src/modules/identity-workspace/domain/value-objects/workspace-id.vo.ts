import { randomUUID } from "crypto";
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

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
