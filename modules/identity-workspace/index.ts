/**
 * Identity & Workspace Module
 *
 * Public API Boundary
 * Following Domain-Driven Design & Modular Monolith architecture.
 * Exposes core module functionality to other modules and the application root.
 */

// Route Registration
export { registerIdentityWorkspaceRoutes } from './infrastructure/http/routes';

// Shared Types and Entities
export { WorkspaceRole } from './domain/entities/workspace-membership.entity';

// Shared Value Objects (safe to consume by other modules)
export { UserId } from './domain/value-objects/user-id.vo';
export { WorkspaceId } from './domain/value-objects/workspace-id.vo';

// DTOs (type-only exports — safe for cross-module consumption)
export type { UserDTO } from './domain/entities/user.entity';
export type { WorkspaceDTO } from './domain/entities/workspace.entity';
export type { WorkspaceInvitationDTO } from './domain/entities/workspace-invitation.entity';
export type { WorkspaceMembershipDTO } from './domain/entities/workspace-membership.entity';

// Additional value objects (safe to consume by other modules)
export { InvitationId } from './domain/value-objects/invitation-id.vo';
export { MembershipId } from './domain/value-objects/membership-id.vo';

// Optional: You can export module specific services or handlers here if required by other modules
// export { UserManagementService } from './application/services/user-management.service';
