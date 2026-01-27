import { randomUUID } from "crypto";
import { InvalidIdFormatError } from "../errors/notification.errors";

export class TemplateId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(): TemplateId {
    return new TemplateId(randomUUID());
  }

  static fromString(id: string): TemplateId {
    if (!this.isValid(id)) {
      throw new InvalidIdFormatError("template ID", id);
    }
    return new TemplateId(id);
  }

  static isValid(id: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: TemplateId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
