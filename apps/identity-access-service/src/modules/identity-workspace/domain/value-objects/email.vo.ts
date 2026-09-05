import {
  EmptyFieldError,
  InvalidFormatError,
} from '@core/domain/domain-error';

export class Email {
  private constructor(private readonly value: string) {
    if (!value) {
      throw new EmptyFieldError("Email");
    }

    if (!Email.isValid(value)) {
      throw new InvalidFormatError("email", "valid email address");
    }
  }

  static create(value: string): Email {
    return new Email(value.toLowerCase().trim());
  }

  static fromString(value: string): Email {
    return new Email(value.toLowerCase().trim());
  }

  static isValid(email: string): boolean {
    if (!email || typeof email !== 'string' || email.length > 254) return false;
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email.trim());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email | null | undefined): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
