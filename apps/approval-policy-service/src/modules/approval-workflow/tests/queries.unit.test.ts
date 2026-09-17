import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GetApprovalChainHandler,
  ListApprovalChainsHandler,
  GetWorkflowHandler,
  ListPendingApprovalsHandler,
  ListUserWorkflowsHandler,
} from '../application/queries';
import { ApprovalChainService } from '../application/services/approval-chain.service';
import { WorkflowService } from '../application/services/workflow.service';
import { OperationService } from '../application/services/operation.service';
import { ApprovalChainDTO } from '../domain/entities/approval-chain.entity';
import { ExpenseWorkflowDTO } from '../domain/entities/expense-workflow.entity';
import { WorkflowStatus } from '../domain/enums/workflow-status';
import { ApprovalStatus } from '../domain/enums/approval-status';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import {
  ApprovalChainNotFoundError,
  WorkflowNotFoundError,
  UnauthorizedWorkflowViewError,
} from '../domain/errors/approval-workflow.errors';
import { UnauthorizedWorkspaceAccessError } from '../../../shared/errors/workspace-authorization.error';
import { IWorkspaceAuthorizationService } from '../../../shared/ports/workspace-authorization.port';

// Strongly typed mock service interfaces
interface MockApprovalChainService {
  getChain: ReturnType<typeof vi.fn>;
  listChains: ReturnType<typeof vi.fn>;
}

interface MockWorkflowService {
  getWorkflow: ReturnType<typeof vi.fn>;
  listPendingApprovals: ReturnType<typeof vi.fn>;
  listUserWorkflows: ReturnType<typeof vi.fn>;
}

interface MockWorkspaceAuthService {
  authorize: ReturnType<typeof vi.fn>;
}

const mockApprovalChainService: MockApprovalChainService = {
  getChain: vi.fn(),
  listChains: vi.fn(),
};

const mockWorkflowService: MockWorkflowService = {
  getWorkflow: vi.fn(),
  listPendingApprovals: vi.fn(),
  listUserWorkflows: vi.fn(),
};

const mockAuthService: MockWorkspaceAuthService = {
  authorize: vi.fn(),
};

const operationService = new OperationService(
  mockAuthService as unknown as IWorkspaceAuthorizationService
);
const typedChainService = mockApprovalChainService as unknown as ApprovalChainService;
const typedWorkflowService = mockWorkflowService as unknown as WorkflowService;

describe('Approval Workflow Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.authorize.mockResolvedValue({
      userId: 'user-1',
      workspaceId: 'ws-1',
      role: 'MEMBER',
    });
  });

  const mockChainDTO = {
    chainId: 'chain-1',
    workspaceId: 'ws-1',
    name: 'Executive Chain',
    description: 'Executive expenses chain',
    minAmount: 100,
    maxAmount: 1000,
    categoryIds: [],
    requiresReceipt: true,
    approverSequence: ['user-2'],
    isActive: true,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies ApprovalChainDTO;

  const mockWorkflowDTO = {
    workflowId: 'wf-1',
    expenseId: 'exp-1',
    workspaceId: 'ws-1',
    userId: 'user-1',
    chainId: 'chain-1',
    status: WorkflowStatus.PENDING,
    currentStepNumber: 1,
    version: 1,
    steps: [
      {
        stepId: 'step-1',
        workflowId: 'wf-1',
        stepNumber: 1,
        approverId: 'approver-1',
        status: ApprovalStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies ExpenseWorkflowDTO;

  // ==========================================================================
  // GetApprovalChainHandler
  // ==========================================================================
  describe('GetApprovalChainHandler', () => {
    const handler = new GetApprovalChainHandler(typedChainService, operationService);
    const query = {
      actorId: 'user-1',
      chainId: 'chain-1',
      workspaceId: 'ws-1',
    };

    it('should throw UnauthorizedWorkspaceAccessError when actor is not authorized in workspace', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('User does not belong to workspace')
      );

      await expect(handler.handle(query)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
      expect(mockApprovalChainService.getChain).not.toHaveBeenCalled();
    });

    it('should throw ApprovalChainNotFoundError when chain does not exist', async () => {
      mockApprovalChainService.getChain.mockRejectedValueOnce(
        new ApprovalChainNotFoundError('chain-1')
      );

      await expect(handler.handle(query)).rejects.toThrow(
        ApprovalChainNotFoundError
      );
      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: 'user-1',
        workspaceId: 'ws-1',
        requiredRole: undefined,
      });
      expect(mockApprovalChainService.getChain).toHaveBeenCalledWith('chain-1', 'ws-1');
    });

    it('should return approval chain DTO on success', async () => {
      mockApprovalChainService.getChain.mockResolvedValueOnce(mockChainDTO);

      const result = await handler.handle(query);

      expect(result).toEqual(mockChainDTO);
      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: 'user-1',
        workspaceId: 'ws-1',
        requiredRole: undefined,
      });
      expect(mockApprovalChainService.getChain).toHaveBeenCalledWith('chain-1', 'ws-1');
    });
  });

  // ==========================================================================
  // ListApprovalChainsHandler
  // ==========================================================================
  describe('ListApprovalChainsHandler', () => {
    const handler = new ListApprovalChainsHandler(typedChainService, operationService);
    const query = {
      actorId: 'user-1',
      workspaceId: 'ws-1',
      activeOnly: true,
      limit: 10,
      offset: 0,
    };

    const mockPaginatedChains: PaginatedResult<ApprovalChainDTO> = {
      items: [mockChainDTO],
      total: 1,
      limit: 10,
      offset: 0,
      hasMore: false,
    };

    it('should throw UnauthorizedWorkspaceAccessError when actor is not authorized in workspace', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('User does not belong to workspace')
      );

      await expect(handler.handle(query)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
      expect(mockApprovalChainService.listChains).not.toHaveBeenCalled();
    });

    it('should return paginated approval chains on success', async () => {
      mockApprovalChainService.listChains.mockResolvedValueOnce(mockPaginatedChains);

      const result = await handler.handle(query);

      expect(result).toEqual(mockPaginatedChains);
      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: 'user-1',
        workspaceId: 'ws-1',
        requiredRole: undefined,
      });
      expect(mockApprovalChainService.listChains).toHaveBeenCalledWith(
        'ws-1',
        true,
        { limit: 10, offset: 0 }
      );
    });

    it('should support querying without optional filters', async () => {
      mockApprovalChainService.listChains.mockResolvedValueOnce(mockPaginatedChains);

      const result = await handler.handle({
        actorId: 'user-1',
        workspaceId: 'ws-1',
      });

      expect(result).toEqual(mockPaginatedChains);
      expect(mockApprovalChainService.listChains).toHaveBeenCalledWith(
        'ws-1',
        undefined,
        { limit: undefined, offset: undefined }
      );
    });
  });

  // ==========================================================================
  // GetWorkflowHandler - Object-Level Visibility Policy
  // ==========================================================================
  describe('GetWorkflowHandler', () => {
    const handler = new GetWorkflowHandler(typedWorkflowService, operationService);
    const query = {
      actorId: 'user-1',
      expenseId: 'exp-1',
      workspaceId: 'ws-1',
    };

    it('should throw UnauthorizedWorkspaceAccessError when actor is not authorized in workspace', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('User does not belong to workspace')
      );

      await expect(handler.handle(query)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
      expect(mockWorkflowService.getWorkflow).not.toHaveBeenCalled();
    });

    it('should throw WorkflowNotFoundError when workflow does not exist', async () => {
      mockWorkflowService.getWorkflow.mockRejectedValueOnce(
        new WorkflowNotFoundError('exp-1')
      );

      await expect(handler.handle(query)).rejects.toThrow(
        WorkflowNotFoundError
      );
      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: 'user-1',
        workspaceId: 'ws-1',
        requiredRole: undefined,
      });
      expect(mockWorkflowService.getWorkflow).toHaveBeenCalledWith('exp-1', 'ws-1');
    });

    it('should return workflow DTO when actor is the workflow requester', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValueOnce(mockWorkflowDTO);

      const result = await handler.handle(query);

      expect(result).toEqual(mockWorkflowDTO);
      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: 'user-1',
        workspaceId: 'ws-1',
        requiredRole: undefined,
      });
      expect(mockWorkflowService.getWorkflow).toHaveBeenCalledWith('exp-1', 'ws-1');
    });

    it('should return workflow DTO when actor is an assigned approver on a step', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: 'approver-1',
        workspaceId: 'ws-1',
        role: 'MEMBER',
      });
      mockWorkflowService.getWorkflow.mockResolvedValueOnce(mockWorkflowDTO);

      const result = await handler.handle({
        actorId: 'approver-1',
        expenseId: 'exp-1',
        workspaceId: 'ws-1',
      });

      expect(result).toEqual(mockWorkflowDTO);
    });

    it('should return workflow DTO when actor is a delegated approver on a step', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: 'delegate-1',
        workspaceId: 'ws-1',
        role: 'MEMBER',
      });
      const delegatedWorkflow: ExpenseWorkflowDTO = {
        ...mockWorkflowDTO,
        steps: [
          {
            stepId: 'step-1',
            workflowId: 'wf-1',
            stepNumber: 1,
            approverId: 'approver-1',
            delegatedTo: 'delegate-1',
            status: ApprovalStatus.PENDING,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };
      mockWorkflowService.getWorkflow.mockResolvedValueOnce(delegatedWorkflow);

      const result = await handler.handle({
        actorId: 'delegate-1',
        expenseId: 'exp-1',
        workspaceId: 'ws-1',
      });

      expect(result).toEqual(delegatedWorkflow);
    });

    it('should return workflow DTO when actor is a workspace ADMIN even if neither requester nor approver', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: 'admin-1',
        workspaceId: 'ws-1',
        role: 'ADMIN',
      });
      mockWorkflowService.getWorkflow.mockResolvedValueOnce(mockWorkflowDTO);

      const result = await handler.handle({
        actorId: 'admin-1',
        expenseId: 'exp-1',
        workspaceId: 'ws-1',
      });

      expect(result).toEqual(mockWorkflowDTO);
    });

    it('should return workflow DTO when actor is a workspace OWNER even if neither requester nor approver', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: 'owner-1',
        workspaceId: 'ws-1',
        role: 'OWNER',
      });
      mockWorkflowService.getWorkflow.mockResolvedValueOnce(mockWorkflowDTO);

      const result = await handler.handle({
        actorId: 'owner-1',
        expenseId: 'exp-1',
        workspaceId: 'ws-1',
      });

      expect(result).toEqual(mockWorkflowDTO);
    });

    it('should throw UnauthorizedWorkflowViewError when unrelated member tries to view workflow', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: 'other-user',
        workspaceId: 'ws-1',
        role: 'MEMBER',
      });
      mockWorkflowService.getWorkflow.mockResolvedValueOnce(mockWorkflowDTO);

      await expect(
        handler.handle({
          actorId: 'other-user',
          expenseId: 'exp-1',
          workspaceId: 'ws-1',
        })
      ).rejects.toThrow(UnauthorizedWorkflowViewError);
    });
  });

  // ==========================================================================
  // ListPendingApprovalsHandler - Cross-Approver Authorization
  // ==========================================================================
  describe('ListPendingApprovalsHandler', () => {
    const handler = new ListPendingApprovalsHandler(typedWorkflowService, operationService);

    const mockPaginatedWorkflows: PaginatedResult<ExpenseWorkflowDTO> = {
      items: [mockWorkflowDTO],
      total: 1,
      limit: 20,
      offset: 5,
      hasMore: false,
    };

    it('should throw UnauthorizedWorkspaceAccessError when actor is not authorized in workspace', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('User does not belong to workspace')
      );

      await expect(
        handler.handle({
          actorId: 'approver-1',
          workspaceId: 'ws-1',
        })
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
      expect(mockWorkflowService.listPendingApprovals).not.toHaveBeenCalled();
    });

    it('should return self pending approvals on success when approverId is omitted', async () => {
      mockWorkflowService.listPendingApprovals.mockResolvedValueOnce(mockPaginatedWorkflows);

      const result = await handler.handle({
        actorId: 'approver-1',
        workspaceId: 'ws-1',
        limit: 20,
        offset: 5,
      });

      expect(result).toEqual(mockPaginatedWorkflows);
      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: 'approver-1',
        workspaceId: 'ws-1',
        requiredRole: undefined,
      });
      expect(mockWorkflowService.listPendingApprovals).toHaveBeenCalledWith(
        'approver-1',
        'ws-1',
        { limit: 20, offset: 5 }
      );
    });

    it('should return self pending approvals on success when approverId equals actorId', async () => {
      mockWorkflowService.listPendingApprovals.mockResolvedValueOnce(mockPaginatedWorkflows);

      const result = await handler.handle({
        actorId: 'approver-1',
        approverId: 'approver-1',
        workspaceId: 'ws-1',
        limit: 20,
        offset: 5,
      });

      expect(result).toEqual(mockPaginatedWorkflows);
      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: 'approver-1',
        workspaceId: 'ws-1',
        requiredRole: undefined,
      });
      expect(mockWorkflowService.listPendingApprovals).toHaveBeenCalledWith(
        'approver-1',
        'ws-1',
        { limit: 20, offset: 5 }
      );
    });

    it('should require ADMIN role when actor queries another approver queue', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('User does not have required role ADMIN')
      );

      await expect(
        handler.handle({
          actorId: 'member-1',
          approverId: 'approver-2',
          workspaceId: 'ws-1',
        })
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);

      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: 'member-1',
        workspaceId: 'ws-1',
        requiredRole: 'ADMIN',
      });
      expect(mockWorkflowService.listPendingApprovals).not.toHaveBeenCalled();
    });

    it('should allow ADMIN actor to query another approver queue', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: 'admin-1',
        workspaceId: 'ws-1',
        role: 'ADMIN',
      });
      mockWorkflowService.listPendingApprovals.mockResolvedValueOnce(mockPaginatedWorkflows);

      const result = await handler.handle({
        actorId: 'admin-1',
        approverId: 'approver-2',
        workspaceId: 'ws-1',
      });

      expect(result).toEqual(mockPaginatedWorkflows);
      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: 'admin-1',
        workspaceId: 'ws-1',
        requiredRole: 'ADMIN',
      });
      expect(mockWorkflowService.listPendingApprovals).toHaveBeenCalledWith(
        'approver-2',
        'ws-1',
        { limit: undefined, offset: undefined }
      );
    });
  });

  // ==========================================================================
  // ListUserWorkflowsHandler - Cross-User Authorization
  // ==========================================================================
  describe('ListUserWorkflowsHandler', () => {
    const handler = new ListUserWorkflowsHandler(typedWorkflowService, operationService);

    const mockPaginatedWorkflows: PaginatedResult<ExpenseWorkflowDTO> = {
      items: [mockWorkflowDTO],
      total: 1,
      limit: 25,
      offset: 0,
      hasMore: false,
    };

    it('should throw UnauthorizedWorkspaceAccessError when actor is not authorized in workspace', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('User does not belong to workspace')
      );

      await expect(
        handler.handle({
          actorId: 'user-1',
          workspaceId: 'ws-1',
        })
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
      expect(mockWorkflowService.listUserWorkflows).not.toHaveBeenCalled();
    });

    it('should return self workflows on success when userId is omitted', async () => {
      mockWorkflowService.listUserWorkflows.mockResolvedValueOnce(mockPaginatedWorkflows);

      const result = await handler.handle({
        actorId: 'user-1',
        workspaceId: 'ws-1',
        limit: 25,
        offset: 0,
      });

      expect(result).toEqual(mockPaginatedWorkflows);
      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: 'user-1',
        workspaceId: 'ws-1',
        requiredRole: undefined,
      });
      expect(mockWorkflowService.listUserWorkflows).toHaveBeenCalledWith(
        'user-1',
        'ws-1',
        { limit: 25, offset: 0 }
      );
    });

    it('should return self workflows on success when userId equals actorId', async () => {
      mockWorkflowService.listUserWorkflows.mockResolvedValueOnce(mockPaginatedWorkflows);

      const result = await handler.handle({
        actorId: 'user-1',
        userId: 'user-1',
        workspaceId: 'ws-1',
        limit: 25,
        offset: 0,
      });

      expect(result).toEqual(mockPaginatedWorkflows);
      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: 'user-1',
        workspaceId: 'ws-1',
        requiredRole: undefined,
      });
      expect(mockWorkflowService.listUserWorkflows).toHaveBeenCalledWith(
        'user-1',
        'ws-1',
        { limit: 25, offset: 0 }
      );
    });

    it('should require ADMIN role when actor queries another user workflows', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('User does not have required role ADMIN')
      );

      await expect(
        handler.handle({
          actorId: 'user-1',
          userId: 'target-user',
          workspaceId: 'ws-1',
        })
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);

      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: 'user-1',
        workspaceId: 'ws-1',
        requiredRole: 'ADMIN',
      });
      expect(mockWorkflowService.listUserWorkflows).not.toHaveBeenCalled();
    });

    it('should allow ADMIN actor to query another user workflows', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: 'admin-1',
        workspaceId: 'ws-1',
        role: 'ADMIN',
      });
      mockWorkflowService.listUserWorkflows.mockResolvedValueOnce(mockPaginatedWorkflows);

      const result = await handler.handle({
        actorId: 'admin-1',
        userId: 'target-user',
        workspaceId: 'ws-1',
      });

      expect(result).toEqual(mockPaginatedWorkflows);
      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: 'admin-1',
        workspaceId: 'ws-1',
        requiredRole: 'ADMIN',
      });
      expect(mockWorkflowService.listUserWorkflows).toHaveBeenCalledWith(
        'target-user',
        'ws-1',
        { limit: undefined, offset: undefined }
      );
    });
  });
});
