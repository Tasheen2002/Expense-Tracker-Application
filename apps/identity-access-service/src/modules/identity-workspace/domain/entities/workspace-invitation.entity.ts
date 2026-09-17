import { randomBytes } from 'crypto';
import { Email } from '../value-objects/email.vo';
import { InvitationId } from '../value-objects/invitation-id.vo';
import { WorkspaceId } from '../value-objects/workspace-id.vo';
import { WorkspaceRole } from './workspace-membership.entity';
import {
  InvitationAlreadyAcceptedError,
  InvitationCancelledError,
  InvitationExpiredError,
  InvalidInvitationExpiryError,
  InvalidRoleError,
} from '../errors/identity.errors';
import {
  INVITATION_EXPIRY_HOURS,
  INVITATION_TOKEN_LENGTH,
} from '../constants/identity.constants';
import { DomainEvent } from '@core/domain/events/domain-event';
import { AggregateRoot } from '@core/domain/aggregate-root';

// ============================================================================
// DTOs
// ============================================================================

export interface WorkspaceInvitationDTO {
  invitationId: string;
  workspaceId: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  isExpired: boolean;
  isAccepted: boolean;
  isCancelled: boolean;
  createdAt: string;
}

// ============================================================================
// Domain Events
// ============================================================================

export class InvitationCreatedEvent extends DomainEvent {
  constructor(
    public readonly invitationId: string,
    public readonly workspaceId: string,
    public readonly email: string,
    public readonly role: string
  ) {
    super(invitationId, 'WorkspaceInvitation');
  }

  get eventType(): string {
    return 'InvitationCreated';
  }

  getPayload(): Record<string, unknown> {
    return {
      invitationId: this.invitationId,
      workspaceId: this.workspaceId,
      email: this.email,
      role: this.role,
    };
  }
}

export class InvitationAcceptedEvent extends DomainEvent {
  constructor(
    public readonly invitationId: string,
    public readonly workspaceId: string,
    public readonly email: string
  ) {
    super(invitationId, 'WorkspaceInvitation');
  }

  get eventType(): string {
    return 'InvitationAccepted';
  }

  getPayload(): Record<string, unknown> {
    return {
      invitationId: this.invitationId,
      workspaceId: this.workspaceId,
      email: this.email,
    };
  }
}

export class InvitationCancelledEvent extends DomainEvent {
  constructor(
    public readonly invitationId: string,
    public readonly workspaceId: string,
    public readonly email: string
  ) {
    super(invitationId, 'WorkspaceInvitation');
  }

  get eventType(): string {
    return 'InvitationCancelled';
  }

  getPayload(): Record<string, unknown> {
    return {
      invitationId: this.invitationId,
      workspaceId: this.workspaceId,
      email: this.email,
    };
  }
}

// ============================================================================
// Entity Props
// ============================================================================

export interface WorkspaceInvitationProps {
  id: InvitationId;
  workspaceId: WorkspaceId;
  email: string;
  role: WorkspaceRole;
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
}

// ============================================================================
// Aggregate Root
// ============================================================================

export class WorkspaceInvitation extends AggregateRoot {
  private constructor(private readonly props: WorkspaceInvitationProps) {
    super();
  }

  static create(data: CreateWorkspaceInvitationData): WorkspaceInvitation {
    const email = Email.create(data.email).getValue();
    if (![WorkspaceRole.ADMIN, WorkspaceRole.MEMBER].includes(data.role)) {
      throw new InvalidRoleError();
    }
    const expiryHours = data.expiryHours ?? INVITATION_EXPIRY_HOURS;
    if (!Number.isInteger(expiryHours) || expiryHours < 1 || expiryHours > 720) {
      throw new InvalidInvitationExpiryError();
    }
    const invitationId = InvitationId.create();
    const workspaceId = WorkspaceId.fromString(data.workspaceId);
    const token = WorkspaceInvitation.generateToken();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + expiryHours * 60 * 60 * 1000
    );

    const invitation = new WorkspaceInvitation({
      id: invitationId,
      workspaceId,
      email,
      role: data.role,
      token,
      expiresAt,
      acceptedAt: null,
      cancelledAt: null,
      createdAt: now,
    });

    invitation.addDomainEvent(
      new InvitationCreatedEvent(
        invitationId.getValue(),
        data.workspaceId,
        email,
        data.role
      )
    );

    return invitation;
  }

  static fromPersistence(data: WorkspaceInvitationData): WorkspaceInvitation {
    return new WorkspaceInvitation({
      id: data.id instanceof InvitationId ? data.id : InvitationId.fromString(data.id),
      workspaceId:
        data.workspaceId instanceof WorkspaceId
          ? data.workspaceId
          : WorkspaceId.fromString(data.workspaceId),
      email: data.email,
      role: data.role,
      token: data.token,
      expiresAt: data.expiresAt,
      acceptedAt: data.acceptedAt,
      cancelledAt: data.cancelledAt ?? null,
      createdAt: data.createdAt,
    });
  }

  // Getters
  get id(): InvitationId { return this.props.id; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get email(): string { return this.props.email; }
  get role(): WorkspaceRole { return this.props.role; }
  get token(): string { return this.props.token; }
  get expiresAt(): Date { return this.props.expiresAt; }
  get acceptedAt(): Date | null { return this.props.acceptedAt; }
  get cancelledAt(): Date | null { return this.props.cancelledAt; }
  isCancelled(): boolean { return this.props.cancelledAt !== null; }
  get createdAt(): Date { return this.props.createdAt; }

  // Business logic methods
  isExpired(): boolean {
    return new Date() >= this.props.expiresAt;
  }

  isAccepted(): boolean {
    return this.props.acceptedAt !== null;
  }

  isPending(): boolean {
    return !this.isAccepted() && !this.isExpired() && !this.isCancelled();
  }

  accept(): void {
    if (this.isCancelled()) {
      throw new InvitationCancelledError();
    }
    if (this.isAccepted()) {
      throw new InvitationAlreadyAcceptedError();
    }
    if (this.isExpired()) {
      throw new InvitationExpiredError();
    }
    this.props.acceptedAt = new Date();

    this.addDomainEvent(
      new InvitationAcceptedEvent(
        this.props.id.getValue(),
        this.props.workspaceId.getValue(),
        this.props.email
      )
    );
  }

  markAsCancelled(): void {
    if (this.isAccepted()) {
      throw new InvitationAlreadyAcceptedError();
    }
    if (this.isCancelled()) {
      throw new InvitationCancelledError();
    }
    this.props.cancelledAt = new Date();
    this.addDomainEvent(
      new InvitationCancelledEvent(
        this.props.id.getValue(),
        this.props.workspaceId.getValue(),
        this.props.email
      )
    );
  }

  // Helper methods
  private static generateToken(): string {
    return randomBytes(INVITATION_TOKEN_LENGTH).toString('hex');
  }

  equals(other: WorkspaceInvitation): boolean {
    return this.props.id.equals(other.props.id);
  }

  toDTO(): WorkspaceInvitationDTO {
    return WorkspaceInvitation.toDTO(this);
  }

  static toDTO(invitation: WorkspaceInvitation): WorkspaceInvitationDTO {
    return {
      invitationId: invitation.props.id.getValue(),
      workspaceId: invitation.props.workspaceId.getValue(),
      email: invitation.props.email,
      role: invitation.props.role,
      token: invitation.props.token,
      expiresAt: invitation.props.expiresAt.toISOString(),
      acceptedAt: invitation.props.acceptedAt?.toISOString() ?? null,
      isExpired: invitation.isExpired(),
      isAccepted: invitation.isAccepted(),
      isCancelled: invitation.isCancelled(),
      createdAt: invitation.props.createdAt.toISOString(),
    };
  }
}

// ============================================================================
// Supporting Types & Interfaces
// ============================================================================

export interface CreateWorkspaceInvitationData {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  expiryHours?: number;
}

export interface WorkspaceInvitationData {
  id: string | InvitationId;
  workspaceId: string | WorkspaceId;
  email: string;
  role: WorkspaceRole;
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  cancelledAt?: Date | null;
  createdAt: Date;
}
