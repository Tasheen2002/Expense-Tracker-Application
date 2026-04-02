import { UserId } from '../value-objects/user-id.vo';
import { Email } from '../value-objects/email.vo';
import { InvalidPasswordHashError } from '../errors/identity.errors';
import { DomainEvent } from '../../../../apps/api/src/shared/domain/events';
import { AggregateRoot } from '../../../../apps/api/src/shared/domain/aggregate-root';

// ============================================================================
// Domain Events
// ============================================================================

export class UserCreatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly fullName: string | null
  ) {
    super(userId, 'User');
  }

  get eventType(): string {
    return 'UserCreated';
  }

  getPayload(): Record<string, unknown> {
    return {
      userId: this.userId,
      email: this.email,
      fullName: this.fullName,
    };
  }
}

export class UserEmailVerifiedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string
  ) {
    super(userId, 'User');
  }

  get eventType(): string {
    return 'UserEmailVerified';
  }

  getPayload(): Record<string, unknown> {
    return {
      userId: this.userId,
      email: this.email,
    };
  }
}

export class UserDeactivatedEvent extends DomainEvent {
  constructor(public readonly userId: string) {
    super(userId, 'User');
  }

  get eventType(): string {
    return 'UserDeactivated';
  }

  getPayload(): Record<string, unknown> {
    return { userId: this.userId };
  }
}

export class UserPasswordChangedEvent extends DomainEvent {
  constructor(public readonly userId: string) {
    super(userId, 'User');
  }

  get eventType(): string {
    return 'UserPasswordChanged';
  }

  getPayload(): Record<string, unknown> {
    return { userId: this.userId };
  }
}

// ============================================================================
// Entity
// ============================================================================

export class User extends AggregateRoot {
  private constructor(
    private readonly id: UserId,
    private email: Email,
    private passwordHash: string,
    private fullName: string | null,
    private isActive: boolean,
    private emailVerified: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date
  ) {
    super();
  }

  static create(data: CreateUserData): User {
    const userId = UserId.create();
    const email = Email.create(data.email);
    const now = new Date();

    const user = new User(
      userId,
      email,
      data.passwordHash,
      data.fullName || null,
      true, // Active by default
      false, // Email not verified by default
      now,
      now
    );

    user.addDomainEvent(
      new UserCreatedEvent(
        userId.getValue(),
        email.getValue(),
        data.fullName || null
      )
    );

    return user;
  }

  static reconstitute(data: {
    id: UserId;
    email: Email;
    passwordHash: string;
    fullName: string | null;
    isActive: boolean;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(
      data.id,
      data.email,
      data.passwordHash,
      data.fullName,
      data.isActive,
      data.emailVerified,
      data.createdAt,
      data.updatedAt
    );
  }

  // Getters
  getId(): UserId {
    return this.id;
  }

  getEmail(): Email {
    return this.email;
  }

  getPasswordHash(): string {
    return this.passwordHash;
  }

  getFullName(): string | null {
    return this.fullName;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getEmailVerified(): boolean {
    return this.emailVerified;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // Business logic methods
  updateFullName(fullName: string | null): void {
    this.fullName = fullName ? fullName.trim() : null;
    this.updatedAt = new Date();
  }

  updateEmail(email: string): void {
    this.email = Email.create(email);
    this.emailVerified = false; // Reset verification when email changes
    this.updatedAt = new Date();
  }

  updatePassword(passwordHash: string): void {
    if (!passwordHash) {
      throw new InvalidPasswordHashError();
    }
    this.passwordHash = passwordHash;
    this.updatedAt = new Date();
    this.addDomainEvent(new UserPasswordChangedEvent(this.id.getValue()));
  }

  verifyEmail(): void {
    this.emailVerified = true;
    this.updatedAt = new Date();
    this.addDomainEvent(
      new UserEmailVerifiedEvent(this.id.getValue(), this.email.getValue())
    );
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
    this.addDomainEvent(new UserDeactivatedEvent(this.id.getValue()));
  }

  activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  equals(other: User): boolean {
    return this.id.equals(other.id);
  }
}

// Supporting types and interfaces
export interface CreateUserData {
  email: string;
  passwordHash: string;
  fullName?: string;
}
