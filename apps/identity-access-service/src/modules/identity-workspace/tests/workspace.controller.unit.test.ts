import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkspaceController } from '../infrastructure/http/controllers/workspace.controller';
import { FastifyReply, FastifyRequest } from 'fastify';
import { CommandResult } from '@expense-tracker/core';

const mockCreateWorkspaceHandler = {
  handle: vi.fn(),
};

const mockUpdateWorkspaceHandler = {
  handle: vi.fn(),
};

const mockDeleteWorkspaceHandler = {
  handle: vi.fn(),
};

const mockGetWorkspaceByIdHandler = {
  handle: vi.fn(),
};

const mockGetUserWorkspacesHandler = {
  handle: vi.fn(),
};

const mockTransferOwnershipHandler = {
  handle: vi.fn(),
};

const mockReply = {
  status: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
} as unknown as FastifyReply;

describe('WorkspaceController (Unit)', () => {
  let controller: WorkspaceController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new WorkspaceController(
      mockCreateWorkspaceHandler as any,
      mockUpdateWorkspaceHandler as any,
      mockDeleteWorkspaceHandler as any,
      mockGetWorkspaceByIdHandler as any,
      mockGetUserWorkspacesHandler as any,
      mockTransferOwnershipHandler as any
    );
  });

  describe('getWorkspace', () => {
    it('should retrieve a workspace by id', async () => {
      const req = {
        params: { workspaceId: 'ws-123' },
        user: { userId: 'u-1' },
      } as unknown as FastifyRequest<any>;

      const workspace = { workspaceId: 'ws-123', name: 'Engineering', ownerId: 'u-1' };
      mockGetWorkspaceByIdHandler.handle.mockResolvedValue(workspace);

      await controller.getWorkspace(req, mockReply);

      expect(mockGetWorkspaceByIdHandler.handle).toHaveBeenCalledWith({
        workspaceId: 'ws-123',
        actorId: 'u-1',
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: workspace,
        })
      );
    });
  });

  describe('getUserWorkspaces', () => {
    it('should retrieve workspaces for user with pagination', async () => {
      const req = {
        query: { page: 1, limit: 20 },
        user: { userId: 'u-1' },
      } as unknown as FastifyRequest<any>;

      const paginatedResult = {
        items: [{ workspaceId: 'ws-1', name: 'WS 1' }],
        total: 1,
        limit: 20,
        offset: 0,
      };
      mockGetUserWorkspacesHandler.handle.mockResolvedValue(paginatedResult);

      await controller.getUserWorkspaces(req, mockReply);

      expect(mockGetUserWorkspacesHandler.handle).toHaveBeenCalledWith({
        userId: 'u-1',
        options: { limit: 20, offset: 0 },
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createWorkspace', () => {
    it('should create workspace and return 201 status', async () => {
      const req = {
        body: { name: 'New Team' },
        user: { userId: 'u-1' },
      } as unknown as FastifyRequest<any>;

      const created = { workspaceId: 'ws-new', name: 'New Team', ownerId: 'u-1' };
      mockCreateWorkspaceHandler.handle.mockResolvedValue(CommandResult.success(created));

      await controller.createWorkspace(req, mockReply);

      expect(mockCreateWorkspaceHandler.handle).toHaveBeenCalledWith({
        name: 'New Team',
        ownerId: 'u-1',
      });
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          statusCode: 201,
          data: created,
        })
      );
    });
  });

  describe('updateWorkspace', () => {
    it('should update workspace and return 200 status', async () => {
      const req = {
        params: { workspaceId: 'ws-123' },
        body: { name: 'Renamed Team' },
        user: { userId: 'u-1' },
      } as unknown as FastifyRequest<any>;

      const updated = { workspaceId: 'ws-123', name: 'Renamed Team' };
      mockUpdateWorkspaceHandler.handle.mockResolvedValue(CommandResult.success(updated));

      await controller.updateWorkspace(req, mockReply);

      expect(mockUpdateWorkspaceHandler.handle).toHaveBeenCalledWith({
        workspaceId: 'ws-123',
        name: 'Renamed Team',
        actorId: 'u-1',
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteWorkspace', () => {
    it('should delete workspace and return 204 status', async () => {
      const req = {
        params: { workspaceId: 'ws-123' },
        user: { userId: 'u-1' },
      } as unknown as FastifyRequest<any>;

      mockDeleteWorkspaceHandler.handle.mockResolvedValue(CommandResult.success(undefined));

      await controller.deleteWorkspace(req, mockReply);

      expect(mockDeleteWorkspaceHandler.handle).toHaveBeenCalledWith({
        workspaceId: 'ws-123',
        actorId: 'u-1',
      });
      expect(mockReply.status).toHaveBeenCalledWith(204);
    });
  });

  describe('transferOwnership', () => {
    it('should transfer ownership and return 200 status', async () => {
      const req = {
        params: { workspaceId: 'ws-123' },
        body: { newOwnerId: 'u-2' },
        user: { userId: 'u-1' },
      } as unknown as FastifyRequest<any>;

      const transferred = { workspaceId: 'ws-123', ownerId: 'u-2' };
      mockTransferOwnershipHandler.handle.mockResolvedValue(CommandResult.success(transferred));

      await controller.transferOwnership(req, mockReply);

      expect(mockTransferOwnershipHandler.handle).toHaveBeenCalledWith({
        workspaceId: 'ws-123',
        newOwnerId: 'u-2',
        actorId: 'u-1',
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });
  });
});
