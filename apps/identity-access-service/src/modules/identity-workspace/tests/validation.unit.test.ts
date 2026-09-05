import { describe, it, expect } from 'vitest';
import {
  registerUserSchema,
  loginUserSchema,
  updateUserSchema,
  userParamsSchema,
  userResponseSchema,
  workspaceParamsSchema,
  memberParamsSchema,
  invitationParamsSchema,
  tokenParamsSchema,
  paginationQuerySchema,
  createWorkspaceSchema,
  updateWorkspaceSchema,
  updateMemberRoleSchema,
  inviteMemberSchema,
  transferOwnershipSchema,
  workspaceResponseSchema,
  workspaceMembershipResponseSchema,
  workspaceInvitationResponseSchema,
  toJsonSchema,
} from '../infrastructure/http/validation';

describe('Validation Schemas (Unit)', () => {
  describe('User Validation Schemas', () => {
    describe('registerUserSchema', () => {
      it('should validate valid user registration payload', () => {
        const valid = {
          email: 'test@example.com',
          password: 'Password123!',
          fullName: 'John Doe',
        };
        const result = registerUserSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });

      it('should allow optional fullName', () => {
        const withoutName = {
          email: 'test@example.com',
          password: 'Password123!',
        };
        expect(registerUserSchema.safeParse(withoutName).success).toBe(true);
      });

      it('should fail on invalid email format', () => {
        const invalid = {
          email: 'invalid-email',
          password: 'Password123!',
        };
        const result = registerUserSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });

      it('should fail on short password (< 8 chars)', () => {
        const invalid = {
          email: 'test@example.com',
          password: 'short',
        };
        const result = registerUserSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });

      it('should fail on password exceeding max length (> 72 chars)', () => {
        const invalid = {
          email: 'test@example.com',
          password: 'a'.repeat(73),
        };
        const result = registerUserSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe('loginUserSchema', () => {
      it('should validate valid credentials', () => {
        const valid = { email: 'user@example.com', password: 'secretpassword' };
        expect(loginUserSchema.safeParse(valid).success).toBe(true);
      });

      it('should reject missing or empty password', () => {
        expect(loginUserSchema.safeParse({ email: 'user@example.com', password: '' }).success).toBe(false);
        expect(loginUserSchema.safeParse({ email: 'user@example.com' }).success).toBe(false);
      });
    });

    describe('updateUserSchema', () => {
      it('should validate partial profile updates', () => {
        expect(updateUserSchema.safeParse({ fullName: 'Updated Name' }).success).toBe(true);
        expect(updateUserSchema.safeParse({ fullName: null }).success).toBe(true);
        expect(updateUserSchema.safeParse({ isActive: false }).success).toBe(true);
        expect(updateUserSchema.safeParse({}).success).toBe(true);
      });
    });

    describe('userParamsSchema', () => {
      it('should validate valid UUID userId', () => {
        expect(userParamsSchema.safeParse({ userId: '123e4567-e89b-12d3-a456-426614174000' }).success).toBe(true);
      });

      it('should reject non-UUID userId', () => {
        expect(userParamsSchema.safeParse({ userId: 'not-a-uuid' }).success).toBe(false);
      });
    });

    describe('userResponseSchema', () => {
      it('should validate complete UserDTO response', () => {
        const userDto = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          fullName: 'Test User',
          isActive: true,
          emailVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        expect(userResponseSchema.safeParse(userDto).success).toBe(true);
      });
    });
  });

  describe('Workspace Validation Schemas', () => {
    describe('createWorkspaceSchema', () => {
      it('should validate valid workspace name', () => {
        expect(createWorkspaceSchema.safeParse({ name: 'Acme Corp' }).success).toBe(true);
      });

      it('should reject empty or overly long workspace name', () => {
        expect(createWorkspaceSchema.safeParse({ name: '' }).success).toBe(false);
        expect(createWorkspaceSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false);
      });
    });

    describe('updateWorkspaceSchema', () => {
      it('should validate valid update fields', () => {
        expect(updateWorkspaceSchema.safeParse({ name: 'Renamed' }).success).toBe(true);
        expect(updateWorkspaceSchema.safeParse({ isActive: false }).success).toBe(true);
        expect(updateWorkspaceSchema.safeParse({}).success).toBe(true);
      });
    });

    describe('paginationQuerySchema', () => {
      it('should coerce string numbers and apply defaults', () => {
        const result = paginationQuerySchema.parse({ page: '2', limit: '25' });
        expect(result.page).toBe(2);
        expect(result.limit).toBe(25);
      });

      it('should apply defaults when omitted', () => {
        const result = paginationQuerySchema.parse({});
        expect(result.page).toBe(1);
        expect(result.limit).toBe(50);
      });

      it('should reject limit > 100 or page < 1', () => {
        expect(paginationQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
        expect(paginationQuerySchema.safeParse({ page: 0 }).success).toBe(false);
      });
    });

    describe('Params Schemas', () => {
      it('should validate workspaceParamsSchema and memberParamsSchema', () => {
        const validWs = { workspaceId: '123e4567-e89b-12d3-a456-426614174000' };
        const validMember = {
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          userId: '223e4567-e89b-12d3-a456-426614174001',
        };
        expect(workspaceParamsSchema.safeParse(validWs).success).toBe(true);
        expect(memberParamsSchema.safeParse(validMember).success).toBe(true);
      });

      it('should validate invitationParamsSchema and tokenParamsSchema', () => {
        const validInviteParams = {
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          invitationId: '223e4567-e89b-12d3-a456-426614174001',
        };
        const validTokenParams = { token: 'active-token-123' };

        expect(invitationParamsSchema.safeParse(validInviteParams).success).toBe(true);
        expect(tokenParamsSchema.safeParse(validTokenParams).success).toBe(true);
        expect(tokenParamsSchema.safeParse({ token: '' }).success).toBe(false);
      });

      it('should reject invalid UUIDs', () => {
        expect(workspaceParamsSchema.safeParse({ workspaceId: 'abc' }).success).toBe(false);
        expect(memberParamsSchema.safeParse({ workspaceId: '123e4567-e89b-12d3-a456-426614174000', userId: 'abc' }).success).toBe(false);
      });
    });

    describe('updateMemberRoleSchema', () => {
      it('should validate supported member roles', () => {
        expect(updateMemberRoleSchema.safeParse({ role: 'admin' }).success).toBe(true);
        expect(updateMemberRoleSchema.safeParse({ role: 'member' }).success).toBe(true);
        expect(updateMemberRoleSchema.safeParse({ role: 'invalid' }).success).toBe(false);
      });
    });

    describe('inviteMemberSchema', () => {
      it('should validate valid invitation input', () => {
        const valid = { email: 'invitee@example.com', role: 'member', expiryHours: 48 };
        expect(inviteMemberSchema.safeParse(valid).success).toBe(true);
      });

      it('should disallow inviting as owner', () => {
        const invalid = { email: 'invitee@example.com', role: 'owner' };
        expect(inviteMemberSchema.safeParse(invalid).success).toBe(false);
      });
    });

    describe('transferOwnershipSchema', () => {
      it('should validate new owner UUID', () => {
        expect(transferOwnershipSchema.safeParse({ newOwnerId: '123e4567-e89b-12d3-a456-426614174000' }).success).toBe(true);
        expect(transferOwnershipSchema.safeParse({ newOwnerId: 'bad' }).success).toBe(false);
      });
    });

    describe('Response Schemas', () => {
      it('should validate workspaceResponseSchema', () => {
        const wsDto = {
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Acme',
          slug: 'acme',
          ownerId: '223e4567-e89b-12d3-a456-426614174001',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        expect(workspaceResponseSchema.safeParse(wsDto).success).toBe(true);
      });

      it('should validate workspaceMembershipResponseSchema', () => {
        const memDto = {
          membershipId: '123e4567-e89b-12d3-a456-426614174000',
          userId: '223e4567-e89b-12d3-a456-426614174001',
          workspaceId: '323e4567-e89b-12d3-a456-426614174002',
          role: 'member',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        expect(workspaceMembershipResponseSchema.safeParse(memDto).success).toBe(true);
      });

      it('should validate complete WorkspaceInvitationDTO including isCancelled', () => {
        const inviteDto = {
          invitationId: '123e4567-e89b-12d3-a456-426614174000',
          workspaceId: '223e4567-e89b-12d3-a456-426614174001',
          email: 'colleague@example.com',
          role: 'member',
          token: 'token1234567890abcdef',
          expiresAt: new Date().toISOString(),
          acceptedAt: null,
          isExpired: false,
          isAccepted: false,
          isCancelled: false,
          createdAt: new Date().toISOString(),
        };
        expect(workspaceInvitationResponseSchema.safeParse(inviteDto).success).toBe(true);
      });
    });

    describe('toJsonSchema utility', () => {
      it('should convert Zod schema to JSON Schema object', () => {
        const jsonSchema = toJsonSchema(createWorkspaceSchema) as any;
        expect(jsonSchema).toBeDefined();
        expect(jsonSchema.type).toBe('object');
        expect(jsonSchema.properties).toHaveProperty('name');
      });
    });
  });
});
