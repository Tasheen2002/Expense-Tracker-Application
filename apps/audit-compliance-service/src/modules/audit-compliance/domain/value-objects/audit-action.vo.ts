import { InvalidAuditActionError } from "../errors/audit.errors";

export class AuditAction {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(action: string): AuditAction {
    const normalized = action?.trim();
    if (!normalized) {
      throw new InvalidAuditActionError(action);
    }
    if (normalized.length > 100) {
      throw new InvalidAuditActionError(action);
    }
    return new AuditAction(normalized);
  }

  static fromPersistence(value: string): AuditAction {
    return new AuditAction(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: AuditAction): boolean {
    return this.value === other.value;
  }
}
