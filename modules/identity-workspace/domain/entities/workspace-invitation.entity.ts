import { InvitationId } from "../value-objects/invitation-id.vo";
import { WorkspaceId } from "../value-objects/workspace-id.vo";
import { WorkspaceRole } from "./workspace-membership.entity";
import { randomBytes } from "crypto";
import {
  InvitationAlreadyAcceptedError,
  InvitationExpiredError,
} from "../errors/identity.errors";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";

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

// ============================================================================
// Entity
// ============================================================================

export class WorkspaceInvitation extends AggregateRoot {
  private constructor(
    private readonly id: InvitationId,
    private readonly workspaceId: WorkspaceId,
    private readonly email: string,
    private readonly role: WorkspaceRole,
    private readonly token: string,
    private readonly expiresAt: Date,
    private acceptedAt: Date | null,
    private readonly createdAt: Date,
  ) {
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

    const invitation = new WorkspaceInvitation(
      invitationId,
      workspaceId,
      data.email.toLowerCase(),
      data.role,
      token,
      expiresAt,
      null,
      now,
    );

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

  static reconstitute(data: WorkspaceInvitationData): WorkspaceInvitation {
    return new WorkspaceInvitation(
      InvitationId.fromString(data.id),
      WorkspaceId.fromString(data.workspaceId),
      data.email,
      data.role,
      data.token,
      data.expiresAt,
      data.acceptedAt,
      data.createdAt,
    );
  }

  static fromDatabaseRow(row: WorkspaceInvitationRow): WorkspaceInvitation {
    return new WorkspaceInvitation(
      InvitationId.fromString(row.id),
      WorkspaceId.fromString(row.workspace_id),
      row.email,
      row.role as WorkspaceRole,
      row.token,
      row.expires_at,
      row.accepted_at,
      row.created_at,
    );
  }

  // Getters
  getId(): InvitationId {
    return this.id;
  }

  getWorkspaceId(): WorkspaceId {
    return this.workspaceId;
  }

  getEmail(): string {
    return this.email;
  }

  getRole(): WorkspaceRole {
    return this.role;
  }

  getToken(): string {
    return this.token;
  }

  getExpiresAt(): Date {
    return this.expiresAt;
  }

  getAcceptedAt(): Date | null {
    return this.acceptedAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  // Business logic methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isAccepted(): boolean {
    return this.acceptedAt !== null;
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
    this.acceptedAt = new Date();

    this.addDomainEvent(
      new InvitationAcceptedEvent(
        this.id.getValue(),
        this.workspaceId.getValue(),
        this.email,
      ),
    );
  }

  // Helper methods
  private static generateToken(): string {
    // Generate a secure random token (32 bytes = 64 hex characters)
    return randomBytes(32).toString("hex");
  }

  // Convert to data for persistence
  toData(): WorkspaceInvitationData {
    return {
      id: this.id.getValue(),
      workspaceId: this.workspaceId.getValue(),
      email: this.email,
      role: this.role,
      token: this.token,
      expiresAt: this.expiresAt,
      acceptedAt: this.acceptedAt,
      createdAt: this.createdAt,
    };
  }

  toDatabaseRow(): WorkspaceInvitationRow {
    return {
      id: this.id.getValue(),
      workspace_id: this.workspaceId.getValue(),
      email: this.email,
      role: this.role,
      token: this.token,
      expires_at: this.expiresAt,
      accepted_at: this.acceptedAt,
      created_at: this.createdAt,
    };
  }

  equals(other: WorkspaceInvitation): boolean {
    return this.id.equals(other.id);
  }
}

// Supporting types and interfaces
export interface CreateWorkspaceInvitationData {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  expiryHours: number; // Default: 168 hours (7 days)
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

export interface WorkspaceInvitationRow {
  id: string;
  workspace_id: string;
  email: string;
  role: string;
  token: string;
  expires_at: Date;
  accepted_at: Date | null;
  created_at: Date;
}
