import { InvalidAuditActionError } from "../errors/audit.errors";

export class AuditAction {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(action: string): AuditAction {
    if (!action || action.trim().length === 0) {
      throw new InvalidAuditActionError(action);
    }
    if (action.length > 100) {
      throw new InvalidAuditActionError(action);
    }
    return new AuditAction(action.trim());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: AuditAction): boolean {
    return this.value === other.value;
  }
}
