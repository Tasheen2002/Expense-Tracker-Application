import { MembershipId } from "../value-objects/membership-id.vo";
import { UserId } from "../value-objects/user-id.vo";
import { WorkspaceId } from "../value-objects/workspace-id.vo";
import { CannotChangeOwnerRoleError } from "../errors/identity.errors";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";

// ============================================================================
// Domain Events
// ============================================================================

export class MemberJoinedWorkspaceEvent extends DomainEvent {
  constructor(
    public readonly membershipId: string,
    public readonly userId: string,
    public readonly workspaceId: string,
    public readonly role: string,
  ) {
    super(membershipId, "WorkspaceMembership");
  }

  get eventType(): string {
    return "MemberJoinedWorkspace";
  }

  getPayload(): Record<string, unknown> {
    return {
      membershipId: this.membershipId,
      userId: this.userId,
      workspaceId: this.workspaceId,
      role: this.role,
    };
  }
}

export class MemberRoleChangedEvent extends DomainEvent {
  constructor(
    public readonly membershipId: string,
    public readonly userId: string,
    public readonly workspaceId: string,
    public readonly oldRole: string,
    public readonly newRole: string,
  ) {
    super(membershipId, "WorkspaceMembership");
  }

  get eventType(): string {
    return "MemberRoleChanged";
  }

  getPayload(): Record<string, unknown> {
    return {
      membershipId: this.membershipId,
      userId: this.userId,
      workspaceId: this.workspaceId,
      oldRole: this.oldRole,
      newRole: this.newRole,
    };
  }
}

export enum WorkspaceRole {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
}

// ============================================================================
// Entity
// ============================================================================

export class WorkspaceMembership extends AggregateRoot {
  private constructor(
    private readonly id: MembershipId,
    private readonly userId: UserId,
    private readonly workspaceId: WorkspaceId,
    private role: WorkspaceRole,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  static create(data: CreateWorkspaceMembershipData): WorkspaceMembership {
    const membershipId = MembershipId.create();
    const userId = UserId.fromString(data.userId);
    const workspaceId = WorkspaceId.fromString(data.workspaceId);
    const now = new Date();

    const membership = new WorkspaceMembership(
      membershipId,
      userId,
      workspaceId,
      data.role,
      now,
      now,
    );

    membership.addDomainEvent(
      new MemberJoinedWorkspaceEvent(
        membershipId.getValue(),
        data.userId,
        data.workspaceId,
        data.role,
      ),
    );

    return membership;
  }

  static reconstitute(data: WorkspaceMembershipData): WorkspaceMembership {
    return new WorkspaceMembership(
      MembershipId.fromString(data.id),
      UserId.fromString(data.userId),
      WorkspaceId.fromString(data.workspaceId),
      data.role,
      data.createdAt,
      data.updatedAt,
    );
  }

  static fromDatabaseRow(row: WorkspaceMembershipRow): WorkspaceMembership {
    return new WorkspaceMembership(
      MembershipId.fromString(row.id),
      UserId.fromString(row.user_id),
      WorkspaceId.fromString(row.workspace_id),
      row.role as WorkspaceRole,
      row.created_at,
      row.updated_at,
    );
  }

  // Getters
  getId(): MembershipId {
    return this.id;
  }

  getUserId(): UserId {
    return this.userId;
  }

  getWorkspaceId(): WorkspaceId {
    return this.workspaceId;
  }

  getRole(): WorkspaceRole {
    return this.role;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // Business logic methods
  changeRole(newRole: WorkspaceRole): void {
    if (this.role === WorkspaceRole.OWNER && newRole !== WorkspaceRole.OWNER) {
      throw new CannotChangeOwnerRoleError();
    }
    const oldRole = this.role;
    this.role = newRole;
    this.updatedAt = new Date();

    this.addDomainEvent(
      new MemberRoleChangedEvent(
        this.id.getValue(),
        this.userId.getValue(),
        this.workspaceId.getValue(),
        oldRole,
        newRole,
      ),
    );
  }

  isOwner(): boolean {
    return this.role === WorkspaceRole.OWNER;
  }

  isAdmin(): boolean {
    return this.role === WorkspaceRole.ADMIN;
  }

  isMember(): boolean {
    return this.role === WorkspaceRole.MEMBER;
  }

  hasAdminPrivileges(): boolean {
    return (
      this.role === WorkspaceRole.OWNER || this.role === WorkspaceRole.ADMIN
    );
  }

  canManageMembers(): boolean {
    return (
      this.role === WorkspaceRole.OWNER || this.role === WorkspaceRole.ADMIN
    );
  }

  canEditWorkspace(): boolean {
    return (
      this.role === WorkspaceRole.OWNER || this.role === WorkspaceRole.ADMIN
    );
  }

  canDeleteWorkspace(): boolean {
    return this.role === WorkspaceRole.OWNER;
  }

  // Convert to data for persistence
  toData(): WorkspaceMembershipData {
    return {
      id: this.id.getValue(),
      userId: this.userId.getValue(),
      workspaceId: this.workspaceId.getValue(),
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toDatabaseRow(): WorkspaceMembershipRow {
    return {
      id: this.id.getValue(),
      user_id: this.userId.getValue(),
      workspace_id: this.workspaceId.getValue(),
      role: this.role,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }

  equals(other: WorkspaceMembership): boolean {
    return this.id.equals(other.id);
  }
}

// Supporting types and interfaces
export interface CreateWorkspaceMembershipData {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
}

export interface WorkspaceMembershipData {
  id: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMembershipRow {
  id: string;
  user_id: string;
  workspace_id: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}
