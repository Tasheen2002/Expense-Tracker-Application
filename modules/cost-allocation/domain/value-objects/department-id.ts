import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

export class DepartmentId extends UuidId {
  private constructor(value: string) {
    super(value, "DepartmentId");
  }

  static create(): DepartmentId {
    return new DepartmentId(randomUUID());
  }

  static fromString(id: string): DepartmentId {
    return new DepartmentId(id);
  }
}
