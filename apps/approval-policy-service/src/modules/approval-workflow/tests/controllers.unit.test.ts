import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ApprovalChainController } from '../infrastructure/http/controllers/approval-chain.controller';
import { WorkflowController } from '../infrastructure/http/controllers/workflow.controller';
import { getAuthenticatedUser } from '../infrastructure/http/controllers/controller.helper';
import { CommandResult } from '@core/application/cqrs';

// Mock Command Handlers - Chain
const mockCreateChainHandler = { handle: vi.fn() };
const mockUpdateChainHandler = { handle: vi.fn() };
const mockDeleteChainHandler = { handle: vi.fn() };
const mockActivateChainHandler = { handle: vi.fn() };
const mockDeactivateChainHandler = { handle: vi.fn() };

// Mock Query Handlers - Chain
const mockGetChainHandler = { handle: vi.fn() };
const mockListChainsHandler = { handle: vi.fn() };

// Mock Command Handlers - Workflow
const mockInitiateWorkflowHandler = { handle: vi.fn() };
const mockApproveStepHandler = { handle: vi.fn() };
const mockRejectStepHandler = { handle: vi.fn() };
const mockDelegateStepHandler = { handle: vi.fn() };
const mockCancelWorkflowHandler = { handle: vi.fn() };

// Mock Query Handlers - Workflow
const mockGetWorkflowHandler = { handle: vi.fn() };
const mockListPendingApprovalsHandler = { handle: vi.fn() };
const mockListUserWorkflowsHandler = { handle: vi.fn() };

function createMockReply(): FastifyReply {
  const reply: Partial<FastifyReply> = {};
  reply.status = vi.fn().mockReturnValue(reply);
  reply.send = vi.fn().mockReturnValue(reply);
  return reply as FastifyReply;
}

describe('Controllers Layer (Unit)', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockWorkspaceId = '223e4567-e89b-12d3-a456-426614174001';
  const mockChainId = '323e4567-e89b-12d3-a456-426614174002';
  const mockExpenseId = '423e4567-e89b-12d3-a456-426614174003';
  const mockAuthToken = 'Bearer test-jwt-token';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // CONTROLLER HELPER TESTS
  // ==========================================================================
  describe('controller.helper - getAuthenticatedUser', () => {
    it('should return user payload when present on request', () => {
      const request = {
        user: {
          userId: mockUserId,
          email: 'test@example.com',
          workspaceId: mockWorkspaceId,
        },
      } as unknown as FastifyRequest;

      const user = getAuthenticatedUser(request);
      expect(user.userId).toBe(mockUserId);
      expect(user.email).toBe('test@example.com');
    });

    it('should throw 401 error when request.user is missing', () => {
      const request = {} as FastifyRequest;

      expect(() => getAuthenticatedUser(request)).toThrow('Authentication required');
      try {
        getAuthenticatedUser(request);
      } catch (err: unknown) {
        const error = err as Error & { statusCode: number };
        expect(error.statusCode).toBe(401);
      }
    });
  });

  // ==========================================================================
  // APPROVAL CHAIN CONTROLLER TESTS
  // ==========================================================================
  describe('ApprovalChainController', () => {
    let controller: ApprovalChainController;
    let reply: FastifyReply;

    beforeEach(() => {
      controller = new ApprovalChainController(
        mockCreateChainHandler as any,
        mockUpdateChainHandler as any,
        mockDeleteChainHandler as any,
        mockGetChainHandler as any,
        mockListChainsHandler as any,
        mockActivateChainHandler as any,
        mockDeactivateChainHandler as any
      );
      reply = createMockReply();
    });

    it('getChain should retrieve chain by ID and forward authToken', async () => {
      const request = {
        params: { workspaceId: mockWorkspaceId, chainId: mockChainId },
        headers: { authorization: mockAuthToken },
        user: { userId: mockUserId, email: 'test@example.com' },
      } as unknown as FastifyRequest<any>;

      const mockChain = { chainId: mockChainId, name: 'Finance' };
      mockGetChainHandler.handle.mockResolvedValue(mockChain);

      await controller.getChain(request, reply);

      expect(mockGetChainHandler.handle).toHaveBeenCalledWith({
        actorId: mockUserId,
        chainId: mockChainId,
        workspaceId: mockWorkspaceId,
        authToken: mockAuthToken,
      });
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockChain,
        })
      );
    });

    it('listChains should retrieve chains and wrap in paginated format', async () => {
      const request = {
        params: { workspaceId: mockWorkspaceId },
        query: { activeOnly: true, limit: 10, offset: 5 },
        headers: { authorization: mockAuthToken },
        user: { userId: mockUserId, email: 'test@example.com' },
      } as unknown as FastifyRequest<any>;

      const mockResult = {
        items: [{ chainId: mockChainId, name: 'Chain 1' }],
        total: 1,
        limit: 10,
        offset: 5,
        hasMore: false,
      };
      mockListChainsHandler.handle.mockResolvedValue(mockResult);

      await controller.listChains(request, reply);

      expect(mockListChainsHandler.handle).toHaveBeenCalledWith({
        actorId: mockUserId,
        workspaceId: mockWorkspaceId,
        activeOnly: true,
        limit: 10,
        offset: 5,
        authToken: mockAuthToken,
      });
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            items: mockResult.items,
            pagination: {
              total: 1,
              limit: 10,
              offset: 5,
              hasMore: false,
            },
          },
        })
      );
    });

    it('createChain should handle create command and return 201', async () => {
      const createBody = { name: 'Finance', requiresReceipt: true, approverSequence: [mockUserId] };
      const request = {
        params: { workspaceId: mockWorkspaceId },
        body: createBody,
        headers: { authorization: mockAuthToken },
        user: { userId: mockUserId, email: 'test@example.com' },
      } as unknown as FastifyRequest<any>;

      const mockData = { chainId: mockChainId, name: 'Finance' };
      mockCreateChainHandler.handle.mockResolvedValue(CommandResult.success(mockData));

      await controller.createChain(request, reply);

      expect(mockCreateChainHandler.handle).toHaveBeenCalledWith({
        actorId: mockUserId,
        workspaceId: mockWorkspaceId,
        authToken: mockAuthToken,
        ...createBody,
      });
      expect(reply.status).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          statusCode: 201,
          data: mockData,
        })
      );
    });

    it('updateChain should handle update command and return { chainId }', async () => {
      const request = {
        params: { workspaceId: mockWorkspaceId, chainId: mockChainId },
        body: { name: 'New Name' },
        headers: { authorization: mockAuthToken },
        user: { userId: mockUserId, email: 'test@example.com' },
      } as unknown as FastifyRequest<any>;

      mockUpdateChainHandler.handle.mockResolvedValue(CommandResult.success({ chainId: mockChainId }));

      await controller.updateChain(request, reply);

      expect(mockUpdateChainHandler.handle).toHaveBeenCalledWith({
        actorId: mockUserId,
        chainId: mockChainId,
        workspaceId: mockWorkspaceId,
        authToken: mockAuthToken,
        name: 'New Name',
      });
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { chainId: mockChainId },
        })
      );
    });

    it('activateChain should handle activate command', async () => {
      const request = {
        params: { workspaceId: mockWorkspaceId, chainId: mockChainId },
        headers: { authorization: mockAuthToken },
        user: { userId: mockUserId, email: 'test@example.com' },
      } as unknown as FastifyRequest<any>;

      mockActivateChainHandler.handle.mockResolvedValue(CommandResult.success());

      await controller.activateChain(request, reply);

      expect(mockActivateChainHandler.handle).toHaveBeenCalledWith({
        actorId: mockUserId,
        chainId: mockChainId,
        workspaceId: mockWorkspaceId,
        authToken: mockAuthToken,
      });
      expect(reply.status).toHaveBeenCalledWith(200);
    });

    it('deactivateChain should handle deactivate command', async () => {
      const request = {
        params: { workspaceId: mockWorkspaceId, chainId: mockChainId },
        headers: { authorization: mockAuthToken },
        user: { userId: mockUserId, email: 'test@example.com' },
      } as unknown as FastifyRequest<any>;

      mockDeactivateChainHandler.handle.mockResolvedValue(CommandResult.success());

      await controller.deactivateChain(request, reply);

      expect(mockDeactivateChainHandler.handle).toHaveBeenCalledWith({
        actorId: mockUserId,
        chainId: mockChainId,
        workspaceId: mockWorkspaceId,
        authToken: mockAuthToken,
      });
      expect(reply.status).toHaveBeenCalledWith(200);
    });

    it('deleteChain should handle delete command and return 204', async () => {
      const request = {
        params: { workspaceId: mockWorkspaceId, chainId: mockChainId },
        headers: { authorization: mockAuthToken },
        user: { userId: mockUserId, email: 'test@example.com' },
      } as unknown as FastifyRequest<any>;

      mockDeleteChainHandler.handle.mockResolvedValue(CommandResult.success());

      await controller.deleteChain(request, reply);

      expect(mockDeleteChainHandler.handle).toHaveBeenCalledWith({
        actorId: mockUserId,
        chainId: mockChainId,
        workspaceId: mockWorkspaceId,
        authToken: mockAuthToken,
      });
      expect(reply.status).toHaveBeenCalledWith(204);
    });

    it('should propagate handler errors directly for global error handling', async () => {
      const request = {
        params: { workspaceId: mockWorkspaceId, chainId: mockChainId },
        headers: {},
        user: { userId: mockUserId, email: 'test@example.com' },
      } as unknown as FastifyRequest<any>;

      mockGetChainHandler.handle.mockRejectedValue(new Error('Database unavailable'));

      await expect(controller.getChain(request, reply)).rejects.toThrow('Database unavailable');
    });
  });

  // ==========================================================================
  // WORKFLOW CONTROLLER TESTS
  // ==========================================================================
  describe('WorkflowController', () => {
    let controller: WorkflowController;
    let reply: FastifyReply;

    beforeEach(() => {
      controller = new WorkflowController(
        mockInitiateWorkflowHandler as any,
        mockApproveStepHandler as any,
        mockRejectStepHandler as any,
        mockDelegateStepHandler as any,
        mockCancelWorkflowHandler as any,
        mockGetWorkflowHandler as any,
        mockListPendingApprovalsHandler as any,
        mockListUserWorkflowsHandler as any
      );
      reply = createMockReply();
    });

    it('getWorkflow should retrieve workflow by expense ID and workspace ID', async () => {
      const request = {
        params: { workspaceId: mockWorkspaceId, expenseId: mockExpenseId },
        headers: { authorization: mockAuthToken },
        user: { userId: mockUserId, email: 'test@example.com' },
      } as unknown as FastifyRequest<any>;

      const mockWorkflow = { expenseId: mockExpenseId, status: 'PENDING' };
      mockGetWorkflowHandler.handle.mockResolvedValue(mockWorkflow);

      await controller.getWorkflow(request, reply);

      expect(mockGetWorkflowHandler.handle).toHaveBeenCalledWith({
        actorId: mockUserId,
        expenseId: mockExpenseId,
        workspaceId: mockWorkspaceId,
        authToken: mockAuthToken,
      });
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockWorkflow,
        })
      );
    });

    it('listPendingApprovals should use authenticated user as actorId and approverId', async () => {
      const request = {
        params: { workspaceId: mockWorkspaceId },
        query: { limit: 20, offset: 0 },
        headers: { authorization: mockAuthToken },
        user: { userId: mockUserId, email: 'test@example.com' },
      } as unknown as FastifyRequest<any>;

      const mockResult = {
        items: [{ expenseId: mockExpenseId, status: 'PENDING' }],
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      };
      mockListPendingApprovalsHandler.handle.mockResolvedValue(mockResult);

      await controller.listPendingApprovals(request, reply);

      expect(mockListPendingApprovalsHandler.handle).toHaveBeenCalledWith({
        actorId: mockUserId,
        approverId: mockUserId,
        workspaceId: mockWorkspaceId,
        limit: 20,
        offset: 0,
        authToken: mockAuthToken,
      });
      expect(reply.status).toHaveBeenCalledWith(200);
    });

    it('listUserWorkflows should use authenticated user as userId', async () => {
      const request = {
        params: { workspaceId: mockWorkspaceId },
        query: {},
        headers: {},
        user: { userId: mockUserId, email: 'test@example.com' },
      } as unknown as FastifyRequest<any>;

      const mockResult = { items: [], total: 0, limit: 50, offset: 0, hasMore: false };
      mockListUserWorkflowsHandler.handle.mockResolvedValue(mockResult);

      await controller.listUserWorkflows(request, reply);

      expect(mockListUserWorkflowsHandler.handle).toHaveBeenCalledWith({
        actorId: mockUserId,
        userId: mockUserId,
        workspaceId: mockWorkspaceId,
        limit: 50,
        offset: 0,
        authToken: undefined,
      });
      expect(reply.status).toHaveBeenCalledWith(200);
    });

    it('initiateWorkflow should handle initiate command and return 201', async () => {
      const request = {
        params: { workspaceId: mockWorkspaceId },
        body: { expenseId: mockExpenseId },
        headers: { authorization: mockAuthToken },
        user: { userId: mockUserId, email: 'test@example.com' },
      } as unknown as FastifyRequest<any>;

      const mockWorkflow = { expenseId: mockExpenseId, status: 'PENDING' };
      mockInitiateWorkflowHandler.handle.mockResolvedValue(CommandResult.success(mockWorkflow));

      await controller.initiateWorkflow(request, reply);

      expect(mockInitiateWorkflowHandler.handle).toHaveBeenCalledWith({
        expenseId: mockExpenseId,
        userId: mockUserId,
        workspaceId: mockWorkspaceId,
        authToken: mockAuthToken,
      });
      expect(reply.status).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          statusCode: 201,
          data: mockWorkflow,
        })
      );
    });

    it('approveStep should use authenticated user as approver and return { expenseId }', async () => {
      const request = {
        params: { workspaceId: mockWorkspaceId, expenseId: mockExpenseId },
        body: { comments: 'Looks good', expectedStepNumber: 1 },
        headers: { authorization: mockAuthToken },
        user: { userId: mockUserId, email: 'test@example.com' },
      } as unknown as FastifyRequest<any>;

      mockApproveStepHandler.handle.mockResolvedValue(CommandResult.success());

      await controller.approveStep(request, reply);

      expect(mockApproveStepHandler.handle).toHaveBeenCalledWith({
        expenseId: mockExpenseId,
        workspaceId: mockWorkspaceId,
        approverId: mockUserId,
        comments: 'Looks good',
        expectedStepNumber: 1,
        authToken: mockAuthToken,
      });
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { expenseId: mockExpenseId },
        })
      );
    });

    it('rejectStep should use authenticated user as approver and return { expenseId }', async () => {
      const request = {
        params: { workspaceId: mockWorkspaceId, expenseId: mockExpenseId },
        body: { comments: 'Policy non-compliant' },
        headers: { authorization: mockAuthToken },
        user: { userId: mockUserId, email: 'test@example.com' },
      } as unknown as FastifyRequest<any>;

      mockRejectStepHandler.handle.mockResolvedValue(CommandResult.success());

      await controller.rejectStep(request, reply);

      expect(mockRejectStepHandler.handle).toHaveBeenCalledWith({
        expenseId: mockExpenseId,
        workspaceId: mockWorkspaceId,
        approverId: mockUserId,
        comments: 'Policy non-compliant',
        authToken: mockAuthToken,
      });
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { expenseId: mockExpenseId },
        })
      );
    });

    it('delegateStep should use authenticated user as fromUserId and forward authToken', async () => {
      const targetUserId = '923e4567-e89b-12d3-a456-426614174099';
      const request = {
        params: { workspaceId: mockWorkspaceId, expenseId: mockExpenseId },
        body: { toUserId: targetUserId },
        headers: { authorization: mockAuthToken },
        user: { userId: mockUserId, email: 'test@example.com' },
      } as unknown as FastifyRequest<any>;

      mockDelegateStepHandler.handle.mockResolvedValue(CommandResult.success());

      await controller.delegateStep(request, reply);

      expect(mockDelegateStepHandler.handle).toHaveBeenCalledWith({
        expenseId: mockExpenseId,
        workspaceId: mockWorkspaceId,
        fromUserId: mockUserId,
        toUserId: targetUserId,
        authToken: mockAuthToken,
      });
      expect(reply.status).toHaveBeenCalledWith(200);
    });

    it('cancelWorkflow should use authenticated user as actorId and forward optional reason', async () => {
      const request = {
        params: { workspaceId: mockWorkspaceId, expenseId: mockExpenseId },
        body: { reason: 'Duplicate' },
        headers: { authorization: mockAuthToken },
        user: { userId: mockUserId, email: 'test@example.com' },
      } as unknown as FastifyRequest<any>;

      mockCancelWorkflowHandler.handle.mockResolvedValue(CommandResult.success());

      await controller.cancelWorkflow(request, reply);

      expect(mockCancelWorkflowHandler.handle).toHaveBeenCalledWith({
        expenseId: mockExpenseId,
        workspaceId: mockWorkspaceId,
        actorId: mockUserId,
        reason: 'Duplicate',
        authToken: mockAuthToken,
      });
      expect(reply.status).toHaveBeenCalledWith(200);
    });

    it('should propagate handler errors directly for global error handling', async () => {
      const request = {
        params: { workspaceId: mockWorkspaceId, expenseId: mockExpenseId },
        headers: {},
        user: { userId: mockUserId, email: 'test@example.com' },
      } as unknown as FastifyRequest<any>;

      mockGetWorkflowHandler.handle.mockRejectedValue(new Error('Database error'));

      await expect(controller.getWorkflow(request, reply)).rejects.toThrow('Database error');
    });
  });
});
