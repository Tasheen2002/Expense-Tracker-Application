import { UserId } from '../value-objects/user-id.vo';
import { Email } from '../value-objects/email.vo';
import { InvalidPasswordHashError } from '../errors/identity.errors';
import { DomainEvent } from '@core/domain/events/domain-event';
import { AggregateRoot } from '@core/domain/aggregate-root';

// ============================================================================
// DTOs
// ============================================================================

export interface UserDTO {
  userId: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

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

export class UserActivatedEvent extends DomainEvent {
  constructor(public readonly userId: string) {
    super(userId, 'User');
  }

  get eventType(): string {
    return 'UserActivated';
  }

  getPayload(): Record<string, unknown> {
    return { userId: this.userId };
  }
}

export class UserEmailChangedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly newEmail: string
  ) {
    super(userId, 'User');
  }

  get eventType(): string {
    return 'UserEmailChanged';
  }

  getPayload(): Record<string, unknown> {
    return {
      userId: this.userId,
      newEmail: this.newEmail,
    };
  }
}

export class UserProfileUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly fullName: string | null
  ) {
    super(userId, 'User');
  }

  get eventType(): string {
    return 'UserProfileUpdated';
  }

  getPayload(): Record<string, unknown> {
    return {
      userId: this.userId,
      fullName: this.fullName,
    };
  }
}

// ============================================================================
// Entity
// ============================================================================

export interface UserProps {
  id: UserId;
  email: Email;
  passwordHash: string;
  fullName: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// DTO
// ============================================================================

export interface UserDTO {
  userId: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export class User extends AggregateRoot {
  private constructor(private props: UserProps) {
    super();
  }

  static create(data: CreateUserData): User {
    const userId = UserId.create();
    const email = Email.create(data.email);
    const now = new Date();

    const user = new User({
      id: userId,
      email,
      passwordHash: data.passwordHash,
      fullName: data.fullName || null,
      isActive: true,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    user.addDomainEvent(
      new UserCreatedEvent(
        userId.getValue(),
        email.getValue(),
        data.fullName || null
      )
    );

    return user;
  }

  static fromPersistence(data: {
    id: UserId;
    email: Email;
    passwordHash: string;
    fullName: string | null;
    isActive: boolean;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User({ ...data });
  }

  // Getters
  get id(): UserId { return this.props.id; }
  get email(): Email { return this.props.email; }
  get passwordHash(): string { return this.props.passwordHash; }
  get fullName(): string | null { return this.props.fullName; }
  get isActive(): boolean { return this.props.isActive; }
  get emailVerified(): boolean { return this.props.emailVerified; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  // Business logic methods
  updateFullName(fullName: string | null): void {
    this.props.fullName = fullName ? fullName.trim() : null;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new UserProfileUpdatedEvent(this.props.id.getValue(), this.props.fullName));
  }

  updateEmail(email: string): void {
    this.props.email = Email.create(email);
    this.props.emailVerified = false;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new UserEmailChangedEvent(this.props.id.getValue(), this.props.email.getValue()));
  }

  updatePassword(passwordHash: string): void {
    if (!passwordHash) {
      throw new InvalidPasswordHashError();
    }
    this.props.passwordHash = passwordHash;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new UserPasswordChangedEvent(this.props.id.getValue()));
  }

  verifyEmail(): void {
    this.props.emailVerified = true;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new UserEmailVerifiedEvent(this.props.id.getValue(), this.props.email.getValue())
    );
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new UserDeactivatedEvent(this.props.id.getValue()));
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new UserActivatedEvent(this.props.id.getValue()));
  }

  equals(other: User): boolean {
    return this.props.id.equals(other.props.id);
  }

  static toDTO(user: User): UserDTO {
    return {
      userId: user.props.id.getValue(),
      email: user.props.email.getValue(),
      fullName: user.props.fullName,
      isActive: user.props.isActive,
      emailVerified: user.props.emailVerified,
      createdAt: user.props.createdAt.toISOString(),
      updatedAt: user.props.updatedAt.toISOString(),
    };
  }
}

// Supporting types and interfaces
export interface CreateUserData {
  email: string;
  passwordHash: string;
  fullName?: string;
}
