import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemberController } from '../infrastructure/http/controllers/member.controller';
import { FastifyReply, FastifyRequest } from 'fastify';
import { CommandResult } from '@expense-tracker/core';
import { WorkspaceRole } from '../domain/entities/workspace-membership.entity';

// Mock handlers
const mockListMembersHandler = {
  handle: vi.fn(),
};

const mockRemoveMemberHandler = {
  handle: vi.fn(),
};

const mockChangeMemberRoleHandler = {
  handle: vi.fn(),
};

const mockGetMemberHandler = {
  handle: vi.fn(),
};

// Mock Reply
const mockReply = {
  status: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
} as unknown as FastifyReply;

describe('MemberController (Unit)', () => {
  let controller: MemberController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new MemberController(
      mockListMembersHandler as any,
      mockRemoveMemberHandler as any,
      mockChangeMemberRoleHandler as any,
      mockGetMemberHandler as any
    );
  });

  describe('listMembers', () => {
    it('should list workspace members with pagination', async () => {
      const req = {
        params: { workspaceId: 'ws-1' },
        query: { page: 2, limit: 10 },
        user: { userId: 'user-1' },
      } as unknown as FastifyRequest<any>;

      const mockResult = {
        items: [{ membershipId: 'mem-1', userId: 'user-2', role: WorkspaceRole.MEMBER }],
        total: 1,
        limit: 10,
        offset: 10,
        hasMore: false,
      };
      mockListMembersHandler.handle.mockResolvedValue(mockResult);

      await controller.listMembers(req, mockReply);

      expect(mockListMembersHandler.handle).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        actorId: 'user-1',
        options: { limit: 10, offset: 10 },
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });

    it('should use default pagination parameters when omitted', async () => {
      const req = {
        params: { workspaceId: 'ws-1' },
        query: {},
        user: { userId: 'user-1' },
      } as unknown as FastifyRequest<any>;

      mockListMembersHandler.handle.mockResolvedValue({ items: [], total: 0 });

      await controller.listMembers(req, mockReply);

      expect(mockListMembersHandler.handle).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        actorId: 'user-1',
        options: { limit: 50, offset: 0 },
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getMember', () => {
    it('should retrieve a specific workspace member', async () => {
      const req = {
        params: { workspaceId: 'ws-1', userId: 'user-2' },
        user: { userId: 'user-1' },
      } as unknown as FastifyRequest<any>;

      const mockMember = { membershipId: 'mem-1', userId: 'user-2', role: WorkspaceRole.MEMBER };
      mockGetMemberHandler.handle.mockResolvedValue(mockMember);

      await controller.getMember(req, mockReply);

      expect(mockGetMemberHandler.handle).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        userId: 'user-2',
        actorId: 'user-1',
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });
  });

  describe('removeMember', () => {
    it('should successfully remove a member with 204 status', async () => {
      const req = {
        params: { workspaceId: 'ws-1', userId: 'user-2' },
        user: { userId: 'user-1' },
      } as unknown as FastifyRequest<any>;

      mockRemoveMemberHandler.handle.mockResolvedValue(CommandResult.success(undefined));

      await controller.removeMember(req, mockReply);

      expect(mockRemoveMemberHandler.handle).toHaveBeenCalledWith({
        actorId: 'user-1',
        workspaceId: 'ws-1',
        userId: 'user-2',
      });
      expect(mockReply.status).toHaveBeenCalledWith(204);
    });

    it('should handle failed command result', async () => {
      const req = {
        params: { workspaceId: 'ws-1', userId: 'user-unknown' },
        user: { userId: 'user-1' },
      } as unknown as FastifyRequest<any>;

      mockRemoveMemberHandler.handle.mockResolvedValue(
        CommandResult.failure('Member not found', undefined, 404)
      );

      await controller.removeMember(req, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(404);
    });
  });

  describe('changeRole', () => {
    it('should update member role successfully', async () => {
      const req = {
        params: { workspaceId: 'ws-1', userId: 'user-2' },
        body: { role: WorkspaceRole.ADMIN },
        user: { userId: 'user-1' },
      } as unknown as FastifyRequest<any>;

      const mockUpdated = { membershipId: 'mem-1', userId: 'user-2', role: WorkspaceRole.ADMIN };
      mockChangeMemberRoleHandler.handle.mockResolvedValue(CommandResult.success(mockUpdated));

      await controller.changeRole(req, mockReply);

      expect(mockChangeMemberRoleHandler.handle).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        userId: 'user-2',
        role: WorkspaceRole.ADMIN,
        actorId: 'user-1',
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });
  });
});
