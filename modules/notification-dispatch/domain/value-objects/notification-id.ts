import { randomUUID } from "crypto";
import { InvalidIdFormatError } from "../errors/notification.errors";

export class NotificationId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(): NotificationId {
    return new NotificationId(randomUUID());
  }

  static fromString(id: string): NotificationId {
    if (!this.isValid(id)) {
      throw new InvalidIdFormatError("notification ID", id);
    }
    return new NotificationId(id);
  }

  static isValid(id: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: NotificationId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
