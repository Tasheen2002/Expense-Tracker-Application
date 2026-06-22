import { randomUUID } from "crypto";
import { UuidId } from "./uuid-id.base";

export class UserId extends UuidId {
  protected constructor(value: string) {
    super(value, "UserId");
  }

  static create(): UserId {
    return new UserId(randomUUID());
  }

  static fromString(value: string): UserId {
    return new UserId(value);
  }
}

export class WorkspaceId extends UuidId {
  protected constructor(value: string) {
    super(value, "WorkspaceId");
  }

  static create(): WorkspaceId {
    return new WorkspaceId(randomUUID());
  }

  static fromString(value: string): WorkspaceId {
    return new WorkspaceId(value);
  }
}

export class CategoryId extends UuidId {
  protected constructor(value: string) {
    super(value, "CategoryId");
  }

  static create(): CategoryId {
    return new CategoryId(randomUUID());
  }

  static fromString(value: string): CategoryId {
    return new CategoryId(value);
  }
}

export class ExpenseId extends UuidId {
  protected constructor(value: string) {
    super(value, "ExpenseId");
  }

  static create(): ExpenseId {
    return new ExpenseId(randomUUID());
  }

  static fromString(value: string): ExpenseId {
    return new ExpenseId(value);
  }
}
