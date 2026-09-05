import { MembershipId } from '../value-objects/membership-id.vo';
import { UserId } from '../value-objects/user-id.vo';
import { WorkspaceId } from '../value-objects/workspace-id.vo';
import {
  CannotChangeOwnerRoleError,
  CannotRemoveOwnerError,
  InvalidRoleError,
} from '../errors/identity.errors';
import { DomainEvent } from '@core/domain/events/domain-event';
import { AggregateRoot } from '@core/domain/aggregate-root';

// ============================================================================
// DTOs
// ============================================================================

export interface WorkspaceMembershipDTO {
  membershipId: string;
  userId: string;
  workspaceId: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Domain Events
// ============================================================================

export class MemberJoinedWorkspaceEvent extends DomainEvent {
  constructor(
    public readonly membershipId: string,
    public readonly userId: string,
    public readonly workspaceId: string,
    public readonly role: string
  ) {
    super(membershipId, 'WorkspaceMembership');
  }

  get eventType(): string {
    return 'MemberJoinedWorkspace';
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
    public readonly newRole: string
  ) {
    super(membershipId, 'WorkspaceMembership');
  }

  get eventType(): string {
    return 'MemberRoleChanged';
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

export class MemberRemovedEvent extends DomainEvent {
  constructor(
    public readonly membershipId: string,
    public readonly userId: string,
    public readonly workspaceId: string
  ) {
    super(membershipId, 'WorkspaceMembership');
  }

  get eventType(): string {
    return 'MemberRemoved';
  }

  getPayload(): Record<string, unknown> {
    return {
      membershipId: this.membershipId,
      userId: this.userId,
      workspaceId: this.workspaceId,
    };
  }
}

// ============================================================================
// Enums & Types
// ============================================================================

export enum WorkspaceRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

// ============================================================================
// Entity Props
// ============================================================================

export interface WorkspaceMembershipProps {
  id: MembershipId;
  userId: UserId;
  workspaceId: WorkspaceId;
  role: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Aggregate Root
// ============================================================================

export class WorkspaceMembership extends AggregateRoot {
  private constructor(private readonly props: WorkspaceMembershipProps) {
    super();
  }

  static create(data: CreateWorkspaceMembershipData): WorkspaceMembership {
    if (!Object.values(WorkspaceRole).includes(data.role)) {
      throw new InvalidRoleError();
    }
    const membershipId = MembershipId.create();
    const userId = UserId.fromString(data.userId);
    const workspaceId = WorkspaceId.fromString(data.workspaceId);
    const now = new Date();

    const membership = new WorkspaceMembership({
      id: membershipId,
      userId,
      workspaceId,
      role: data.role,
      createdAt: now,
      updatedAt: now,
    });

    membership.addDomainEvent(
      new MemberJoinedWorkspaceEvent(
        membershipId.getValue(),
        data.userId,
        data.workspaceId,
        data.role
      )
    );

    return membership;
  }

  static fromPersistence(data: WorkspaceMembershipData): WorkspaceMembership {
    return new WorkspaceMembership({
      id: data.id instanceof MembershipId ? data.id : MembershipId.fromString(data.id),
      userId: data.userId instanceof UserId ? data.userId : UserId.fromString(data.userId),
      workspaceId:
        data.workspaceId instanceof WorkspaceId
          ? data.workspaceId
          : WorkspaceId.fromString(data.workspaceId),
      role: data.role,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  // Getters
  get id(): MembershipId { return this.props.id; }
  get userId(): UserId { return this.props.userId; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get role(): WorkspaceRole { return this.props.role; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  // Business logic methods
  changeRole(newRole: WorkspaceRole): void {
    if (this.props.role === WorkspaceRole.OWNER || newRole === WorkspaceRole.OWNER) {
      throw new CannotChangeOwnerRoleError();
    }
    if (!Object.values(WorkspaceRole).includes(newRole)) {
      throw new InvalidRoleError();
    }
    const oldRole = this.props.role;
    this.props.role = newRole;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new MemberRoleChangedEvent(
        this.props.id.getValue(),
        this.props.userId.getValue(),
        this.props.workspaceId.getValue(),
        oldRole,
        newRole
      )
    );
  }

  /** Only the atomic ownership-transfer use case may call this transition. */
  transferOwnershipRole(role: WorkspaceRole.OWNER | WorkspaceRole.ADMIN): void {
    const oldRole = this.props.role;
    this.props.role = role;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new MemberRoleChangedEvent(
        this.id.getValue(),
        this.userId.getValue(),
        this.workspaceId.getValue(),
        oldRole,
        role
      )
    );
  }

  markAsRemoved(): void {
    if (this.isOwner()) {
      throw new CannotRemoveOwnerError();
    }
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new MemberRemovedEvent(
        this.props.id.getValue(),
        this.props.userId.getValue(),
        this.props.workspaceId.getValue()
      )
    );
  }

  isOwner(): boolean {
    return this.props.role === WorkspaceRole.OWNER;
  }

  isAdmin(): boolean {
    return this.props.role === WorkspaceRole.ADMIN;
  }

  isMember(): boolean {
    return this.props.role === WorkspaceRole.MEMBER;
  }

  hasAdminPrivileges(): boolean {
    return (
      this.props.role === WorkspaceRole.OWNER || this.props.role === WorkspaceRole.ADMIN
    );
  }

  canManageMembers(): boolean {
    return (
      this.props.role === WorkspaceRole.OWNER || this.props.role === WorkspaceRole.ADMIN
    );
  }

  canEditWorkspace(): boolean {
    return (
      this.props.role === WorkspaceRole.OWNER || this.props.role === WorkspaceRole.ADMIN
    );
  }

  canDeleteWorkspace(): boolean {
    return this.props.role === WorkspaceRole.OWNER;
  }

  equals(other: WorkspaceMembership): boolean {
    return this.props.id.equals(other.props.id);
  }

  toDTO(): WorkspaceMembershipDTO {
    return WorkspaceMembership.toDTO(this);
  }

  static toDTO(membership: WorkspaceMembership): WorkspaceMembershipDTO {
    return {
      membershipId: membership.props.id.getValue(),
      userId: membership.props.userId.getValue(),
      workspaceId: membership.props.workspaceId.getValue(),
      role: membership.props.role,
      createdAt: membership.props.createdAt.toISOString(),
      updatedAt: membership.props.updatedAt.toISOString(),
    };
  }
}

// ============================================================================
// Supporting Types & Interfaces
// ============================================================================

export interface CreateWorkspaceMembershipData {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
}

export interface WorkspaceMembershipData {
  id: string | MembershipId;
  userId: string | UserId;
  workspaceId: string | WorkspaceId;
  role: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;
}
