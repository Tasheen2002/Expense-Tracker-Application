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

// Optional: You can export module specific services or handlers here if required by other modules
// export { UserManagementService } from './application/services/user-management.service';
