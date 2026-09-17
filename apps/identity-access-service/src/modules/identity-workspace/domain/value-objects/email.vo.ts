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
    if (!email || typeof email !== 'string') return false;
    const trimmed = email.trim();
    if (trimmed.length === 0 || trimmed.length > 254) return false;

    const atIndex = trimmed.indexOf('@');
    if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf('@')) {
      return false;
    }

    const localPart = trimmed.slice(0, atIndex);
    const domainPart = trimmed.slice(atIndex + 1);

    if (localPart.length === 0 || localPart.length > 64) {
      return false;
    }

    if (domainPart.length === 0 || domainPart.length > 255) {
      return false;
    }

    if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
      return false;
    }

    const localPartRegex = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
    if (!localPartRegex.test(localPart)) {
      return false;
    }

    const domainPartRegex =
      /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return domainPartRegex.test(domainPart);
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
