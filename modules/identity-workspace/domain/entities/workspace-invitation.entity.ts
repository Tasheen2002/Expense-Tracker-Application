import { InvitationId } from "../value-objects/invitation-id.vo";
import { WorkspaceId } from "../value-objects/workspace-id.vo";
import { WorkspaceRole } from "./workspace-membership.entity";
import { randomBytes } from "crypto";
import {
  InvitationAlreadyAcceptedError,
  InvitationExpiredError,
} from "../errors/identity.errors";
import { DomainEvent } from "../../../../packages/core/src/domain/events/domain-event";
import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';

// ============================================================================
// Domain Events
// ============================================================================

export class InvitationCreatedEvent extends DomainEvent {
  constructor(
    public readonly invitationId: string,
    public readonly workspaceId: string,
    public readonly email: string,
    public readonly role: string,
  ) {
    super(invitationId, "WorkspaceInvitation");
  }

  get eventType(): string {
    return "InvitationCreated";
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
    public readonly email: string,
  ) {
    super(invitationId, "WorkspaceInvitation");
  }

  get eventType(): string {
    return "InvitationAccepted";
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
    public readonly email: string,
  ) {
    super(invitationId, "WorkspaceInvitation");
  }

  get eventType(): string {
    return "InvitationCancelled";
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
// Entity
// ============================================================================

export interface WorkspaceInvitationProps {
  id: InvitationId;
  workspaceId: WorkspaceId;
  email: string;
  role: WorkspaceRole;
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

export class WorkspaceInvitation extends AggregateRoot {
  private constructor(private props: WorkspaceInvitationProps) {
    super();
  }

  static create(data: CreateWorkspaceInvitationData): WorkspaceInvitation {
    const invitationId = InvitationId.create();
    const workspaceId = WorkspaceId.fromString(data.workspaceId);
    const token = WorkspaceInvitation.generateToken();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + data.expiryHours * 60 * 60 * 1000,
    );

    const invitation = new WorkspaceInvitation({
      id: invitationId,
      workspaceId,
      email: data.email.toLowerCase(),
      role: data.role,
      token,
      expiresAt,
      acceptedAt: null,
      createdAt: now,
    });

    invitation.addDomainEvent(
      new InvitationCreatedEvent(
        invitationId.getValue(),
        data.workspaceId,
        data.email.toLowerCase(),
        data.role,
      ),
    );

    return invitation;
  }

  static fromPersistence(data: WorkspaceInvitationData): WorkspaceInvitation {
    return new WorkspaceInvitation({
      id: InvitationId.fromString(data.id),
      workspaceId: WorkspaceId.fromString(data.workspaceId),
      email: data.email,
      role: data.role,
      token: data.token,
      expiresAt: data.expiresAt,
      acceptedAt: data.acceptedAt,
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
  get createdAt(): Date { return this.props.createdAt; }

  // Business logic methods
  isExpired(): boolean {
    return new Date() > this.props.expiresAt;
  }

  isAccepted(): boolean {
    return this.props.acceptedAt !== null;
  }

  isPending(): boolean {
    return !this.isAccepted() && !this.isExpired();
  }

  accept(): void {
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
        this.props.email,
      ),
    );
  }

  markAsCancelled(): void {
    this.addDomainEvent(
      new InvitationCancelledEvent(
        this.props.id.getValue(),
        this.props.workspaceId.getValue(),
        this.props.email,
      ),
    );
  }

  // Helper methods
  private static generateToken(): string {
    return randomBytes(32).toString("hex");
  }

  equals(other: WorkspaceInvitation): boolean {
    return this.props.id.equals(other.props.id);
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
      createdAt: invitation.props.createdAt.toISOString(),
    };
  }
}

// ============================================================================
// DTO
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
  createdAt: string;
}

// Supporting types and interfaces
export interface CreateWorkspaceInvitationData {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  expiryHours: number;
}

export interface WorkspaceInvitationData {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}
