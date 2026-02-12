import {
  EmptyFieldError,
  InvalidFormatError,
} from "../../../../apps/api/src/shared/domain/errors";

export class Email {
  private constructor(private readonly value: string) {
    if (!value) {
      throw new EmptyFieldError("Email");
    }

    if (!this.isValidEmail(value)) {
      throw new InvalidFormatError("email", "valid email address");
    }
  }

  static create(value: string): Email {
    return new Email(value.toLowerCase().trim());
  }

  static fromString(value: string): Email {
    return new Email(value.toLowerCase().trim());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  private isValidEmail(email: string): boolean {
    if (email.length > 254) return false;
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  }
}
