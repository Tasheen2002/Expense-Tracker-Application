import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

export class ProjectId extends UuidId {
  private constructor(value: string) {
    super(value, "ProjectId");
  }

  static create(): ProjectId {
    return new ProjectId(randomUUID());
  }

  static fromString(id: string): ProjectId {
    return new ProjectId(id);
  }
}
