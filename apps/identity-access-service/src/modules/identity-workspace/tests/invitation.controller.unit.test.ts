import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvitationController } from '../infrastructure/http/controllers/invitation.controller';
import { FastifyReply, FastifyRequest } from 'fastify';
import { CommandResult } from '@expense-tracker/core';

const mockCreateInvitationHandler = {
  handle: vi.fn(),
};

const mockAcceptInvitationHandler = {
  handle: vi.fn(),
};

const mockCancelInvitationHandler = {
  handle: vi.fn(),
};

const mockGetInvitationByTokenHandler = {
  handle: vi.fn(),
};

const mockGetPendingInvitationsHandler = {
  handle: vi.fn(),
};

const mockReply = {
  status: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
} as unknown as FastifyReply;

describe('InvitationController (Unit)', () => {
  let controller: InvitationController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new InvitationController(
      mockCreateInvitationHandler as any,
      mockAcceptInvitationHandler as any,
      mockCancelInvitationHandler as any,
      mockGetInvitationByTokenHandler as any,
      mockGetPendingInvitationsHandler as any
    );
  });

  describe('getInvitationByToken', () => {
    it('should return 404 when invitation is not found', async () => {
      const req = {
        params: { token: 'invalid-token' },
      } as unknown as FastifyRequest<any>;

      mockGetInvitationByTokenHandler.handle.mockResolvedValue(null);

      await controller.getInvitationByToken(req, mockReply);

      expect(mockGetInvitationByTokenHandler.handle).toHaveBeenCalledWith({
        token: 'invalid-token',
      });
      expect(mockReply.status).toHaveBeenCalledWith(404);
    });

    it('should return 410 when invitation is expired or already accepted', async () => {
      const req = {
        params: { token: 'expired-token' },
      } as unknown as FastifyRequest<any>;

      mockGetInvitationByTokenHandler.handle.mockResolvedValue({
        invitationId: 'inv-1',
        isExpired: true,
        isAccepted: false,
        isCancelled: false,
      });

      await controller.getInvitationByToken(req, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(410);
    });

    it('should return 200 when invitation is pending and valid', async () => {
      const req = {
        params: { token: 'valid-token' },
      } as unknown as FastifyRequest<any>;

      const validInvitation = {
        invitationId: 'inv-1',
        email: 'colleague@example.com',
        isExpired: false,
        isAccepted: false,
        isCancelled: false,
      };
      mockGetInvitationByTokenHandler.handle.mockResolvedValue(validInvitation);

      await controller.getInvitationByToken(req, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: validInvitation,
        })
      );
    });
  });

  describe('listWorkspaceInvitations', () => {
    it('should list pending invitations for workspace with pagination', async () => {
      const req = {
        params: { workspaceId: 'ws-1' },
        query: { page: 1, limit: 10 },
        user: { userId: 'u-admin' },
      } as unknown as FastifyRequest<any>;

      const paginatedResult = {
        items: [{ invitationId: 'inv-1', email: 'colleague@example.com' }],
        total: 1,
        limit: 10,
        offset: 0,
      };
      mockGetPendingInvitationsHandler.handle.mockResolvedValue(paginatedResult);

      await controller.listWorkspaceInvitations(req, mockReply);

      expect(mockGetPendingInvitationsHandler.handle).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        actorId: 'u-admin',
        options: { limit: 10, offset: 0 },
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createInvitation', () => {
    it('should create invitation and return 201 status', async () => {
      const req = {
        params: { workspaceId: 'ws-1' },
        body: { email: 'invitee@example.com', role: 'member', expiryHours: 48 },
        user: { userId: 'u-admin' },
      } as unknown as FastifyRequest<any>;

      const createdInvitation = {
        invitationId: 'inv-new',
        email: 'invitee@example.com',
        role: 'member',
      };
      mockCreateInvitationHandler.handle.mockResolvedValue(
        CommandResult.success(createdInvitation)
      );

      await controller.createInvitation(req, mockReply);

      expect(mockCreateInvitationHandler.handle).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        email: 'invitee@example.com',
        role: 'member',
        expiryHours: 48,
        invitedBy: 'u-admin',
      });
      expect(mockReply.status).toHaveBeenCalledWith(201);
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation and return 200 status', async () => {
      const req = {
        params: { token: 'token-abc' },
        user: { userId: 'u-acceptor' },
      } as unknown as FastifyRequest<any>;

      const accepted = { membershipId: 'mem-new' };
      mockAcceptInvitationHandler.handle.mockResolvedValue(CommandResult.success(accepted));

      await controller.acceptInvitation(req, mockReply);

      expect(mockAcceptInvitationHandler.handle).toHaveBeenCalledWith({
        token: 'token-abc',
        userId: 'u-acceptor',
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel invitation and return 204 status', async () => {
      const req = {
        params: { workspaceId: 'ws-1', invitationId: 'inv-123' },
        user: { userId: 'u-admin' },
      } as unknown as FastifyRequest<any>;

      mockCancelInvitationHandler.handle.mockResolvedValue(CommandResult.success(undefined));

      await controller.cancelInvitation(req, mockReply);

      expect(mockCancelInvitationHandler.handle).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        invitationId: 'inv-123',
        actorId: 'u-admin',
      });
      expect(mockReply.status).toHaveBeenCalledWith(204);
    });
  });
});
