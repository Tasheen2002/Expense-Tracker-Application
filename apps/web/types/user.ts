// ============================================================================
// User & Workspace Types - Matching Backend Prisma Schema
// ============================================================================

export interface UserAccount {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMembership {
  id: string;
  userId: string;
  workspaceId: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  user?: UserAccount;
  workspace?: Workspace;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

// ============================================================================
// Auth DTOs
// ============================================================================

export interface RegisterDTO {
  email: string;
  password: string;
  fullName?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    userId: string;
    email: string;
    fullName: string | null;
    isActive: boolean;
    emailVerified: boolean;
  };
  token: string;
}

export interface CurrentUser {
  userId: string;
  email: string;
  workspaceId: string | null;
}

// ============================================================================
// Workspace DTOs
// ============================================================================

export interface CreateWorkspaceDTO {
  name: string;
  slug: string;
}

export interface UpdateWorkspaceDTO {
  name?: string;
  slug?: string;
  isActive?: boolean;
}

export interface InviteMemberDTO {
  email: string;
  role: string;
}

export interface UpdateMemberRoleDTO {
  role: string;
}
