export class Email {
  private constructor(private readonly value: string) {
    if (!value) {
      throw new Error('Email cannot be empty')
    }

    if (!this.isValidEmail(value)) {
      throw new Error('Invalid email format')
    }
  }

  static create(value: string): Email {
    return new Email(value.toLowerCase().trim())
  }

  static fromString(value: string): Email {
    return new Email(value.toLowerCase().trim())
  }

  getValue(): string {
    return this.value
  }

  equals(other: Email): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}
