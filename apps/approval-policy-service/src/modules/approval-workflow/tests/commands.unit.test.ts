import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CreateApprovalChainHandler,
  UpdateApprovalChainHandler,
  DeleteApprovalChainHandler,
  ActivateApprovalChainHandler,
  DeactivateApprovalChainHandler,
  InitiateWorkflowHandler,
  ApproveStepHandler,
  RejectStepHandler,
  DelegateStepHandler,
  CancelWorkflowHandler,
} from '../application/commands';
import { ApprovalChainService } from '../application/services/approval-chain.service';
import { WorkflowService } from '../application/services/workflow.service';
import { OperationService } from '../application/services/operation.service';
import { ApprovalChainDTO } from '../domain/entities/approval-chain.entity';
import { ExpenseWorkflow, ExpenseWorkflowDTO } from '../domain/entities/expense-workflow.entity';
import { WorkflowStatus } from '../domain/enums/workflow-status';
import {
  WorkflowId,
  ApprovalChainId,
} from '../domain/value-objects';
import { ExpenseId, WorkspaceId, UserId } from '@core/domain/value-objects';
import {
  ApprovalChainNotFoundError,
  EmptyApproverSequenceError,
  WorkflowAlreadyExistsError,
  NoMatchingApprovalChainError,
  WorkflowNotFoundError,
  UnauthorizedApproverError,
  CurrentStepNotFoundError,
  RejectionReasonRequiredError,
  InvalidDelegationError,
  UnauthorizedWorkflowCancellationError,
} from '../domain/errors/approval-workflow.errors';
import { UnauthorizedWorkspaceAccessError } from '../../../shared/errors/workspace-authorization.error';
import { IWorkspaceAuthorizationService } from '../../../shared/ports/workspace-authorization.port';
import { IExpenseWorkflowRepository } from '../domain/repositories/expense-workflow.repository';
import { IApprovalChainRepository } from '../domain/repositories/approval-chain.repository';

// Strongly typed mock service interfaces
interface MockApprovalChainService {
  createChain: ReturnType<typeof vi.fn>;
  updateChain: ReturnType<typeof vi.fn>;
  deleteChain: ReturnType<typeof vi.fn>;
  activateChain: ReturnType<typeof vi.fn>;
  deactivateChain: ReturnType<typeof vi.fn>;
  getChain: ReturnType<typeof vi.fn>;
  listChains: ReturnType<typeof vi.fn>;
}

interface MockWorkflowService {
  initiateWorkflow: ReturnType<typeof vi.fn>;
  approveStep: ReturnType<typeof vi.fn>;
  rejectStep: ReturnType<typeof vi.fn>;
  delegateStep: ReturnType<typeof vi.fn>;
  cancelWorkflow: ReturnType<typeof vi.fn>;
  getWorkflow: ReturnType<typeof vi.fn>;
  listPendingApprovals: ReturnType<typeof vi.fn>;
  listUserWorkflows: ReturnType<typeof vi.fn>;
}

interface MockWorkspaceAuthService {
  authorize: ReturnType<typeof vi.fn>;
}

interface MockWorkflowRepository {
  findByExpenseId: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
}

interface MockChainRepository {
  findApplicableChain: ReturnType<typeof vi.fn>;
}

const mockApprovalChainService: MockApprovalChainService = {
  createChain: vi.fn(),
  updateChain: vi.fn(),
  deleteChain: vi.fn(),
  activateChain: vi.fn(),
  deactivateChain: vi.fn(),
  getChain: vi.fn(),
  listChains: vi.fn(),
};

const mockWorkflowService: MockWorkflowService = {
  initiateWorkflow: vi.fn(),
  approveStep: vi.fn(),
  rejectStep: vi.fn(),
  delegateStep: vi.fn(),
  cancelWorkflow: vi.fn(),
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

describe('Approval Workflow Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.authorize.mockResolvedValue({
      userId: 'admin-1',
      workspaceId: 'ws-1',
      role: 'ADMIN',
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
    steps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies ExpenseWorkflowDTO;

  describe('CreateApprovalChainHandler', () => {
    const handler = new CreateApprovalChainHandler(typedChainService, operationService);
    const input = {
      actorId: 'admin-1',
      workspaceId: 'ws-1',
      name: 'Executive Chain',
      description: 'Executive expenses chain',
      minAmount: 100,
      maxAmount: 1000,
      requiresReceipt: true,
      approverSequence: ['user-2'],
    };

    it('should throw UnauthorizedWorkspaceAccessError when actor lacks admin role', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('User does not have required role ADMIN')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
      expect(mockApprovalChainService.createChain).not.toHaveBeenCalled();
    });

    it('should throw when empty approver sequence is supplied', async () => {
      mockApprovalChainService.createChain.mockRejectedValueOnce(
        new EmptyApproverSequenceError()
      );
      await expect(handler.handle({ ...input, approverSequence: [] })).rejects.toThrow(
        EmptyApproverSequenceError
      );
    });

    it('should return success result on successful chain creation', async () => {
      mockApprovalChainService.createChain.mockResolvedValueOnce(mockChainDTO);
      const result = await handler.handle(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockChainDTO);
      expect(mockApprovalChainService.createChain).toHaveBeenCalledWith(input);
    });
  });

  describe('UpdateApprovalChainHandler', () => {
    const handler = new UpdateApprovalChainHandler(typedChainService, operationService);
    const input = {
      actorId: 'admin-1',
      chainId: 'chain-1',
      workspaceId: 'ws-1',
      name: 'Updated Executive Chain',
    };

    it('should throw UnauthorizedWorkspaceAccessError when actor lacks admin role', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('User does not have required role ADMIN')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
      expect(mockApprovalChainService.updateChain).not.toHaveBeenCalled();
    });

    it('should throw when approval chain not found', async () => {
      mockApprovalChainService.updateChain.mockRejectedValueOnce(
        new ApprovalChainNotFoundError('chain-1')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        ApprovalChainNotFoundError
      );
    });

    it('should return success result on successful chain update', async () => {
      const updatedDTO = {
        ...mockChainDTO,
        name: 'Updated Executive Chain',
      } satisfies ApprovalChainDTO;
      mockApprovalChainService.updateChain.mockResolvedValueOnce(updatedDTO);
      const result = await handler.handle(input);
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Updated Executive Chain');
      expect(mockApprovalChainService.updateChain).toHaveBeenCalledWith(input);
    });
  });

  describe('DeleteApprovalChainHandler', () => {
    const handler = new DeleteApprovalChainHandler(typedChainService, operationService);
    const input = {
      actorId: 'admin-1',
      chainId: 'chain-1',
      workspaceId: 'ws-1',
    };

    it('should throw UnauthorizedWorkspaceAccessError when actor lacks admin role', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('User does not have required role ADMIN')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
      expect(mockApprovalChainService.deleteChain).not.toHaveBeenCalled();
    });

    it('should throw when approval chain not found', async () => {
      mockApprovalChainService.deleteChain.mockRejectedValueOnce(
        new ApprovalChainNotFoundError('chain-1')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        ApprovalChainNotFoundError
      );
    });

    it('should return success result with void data on deletion', async () => {
      mockApprovalChainService.deleteChain.mockResolvedValueOnce(undefined);
      const result = await handler.handle(input);
      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(mockApprovalChainService.deleteChain).toHaveBeenCalledWith(
        'chain-1',
        'ws-1'
      );
    });
  });

  describe('ActivateApprovalChainHandler', () => {
    const handler = new ActivateApprovalChainHandler(typedChainService, operationService);
    const input = {
      actorId: 'admin-1',
      chainId: 'chain-1',
      workspaceId: 'ws-1',
    };

    it('should throw UnauthorizedWorkspaceAccessError when actor lacks admin role', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('User does not have required role ADMIN')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
      expect(mockApprovalChainService.activateChain).not.toHaveBeenCalled();
    });

    it('should throw when approval chain not found', async () => {
      mockApprovalChainService.activateChain.mockRejectedValueOnce(
        new ApprovalChainNotFoundError('chain-1')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        ApprovalChainNotFoundError
      );
    });

    it('should return success result on chain activation', async () => {
      mockApprovalChainService.activateChain.mockResolvedValueOnce(mockChainDTO);
      const result = await handler.handle(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockChainDTO);
      expect(mockApprovalChainService.activateChain).toHaveBeenCalledWith(
        'chain-1',
        'ws-1'
      );
    });
  });

  describe('DeactivateApprovalChainHandler', () => {
    const handler = new DeactivateApprovalChainHandler(typedChainService, operationService);
    const input = {
      actorId: 'admin-1',
      chainId: 'chain-1',
      workspaceId: 'ws-1',
    };

    it('should throw UnauthorizedWorkspaceAccessError when actor lacks admin role', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('User does not have required role ADMIN')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
      expect(mockApprovalChainService.deactivateChain).not.toHaveBeenCalled();
    });

    it('should throw when approval chain not found', async () => {
      mockApprovalChainService.deactivateChain.mockRejectedValueOnce(
        new ApprovalChainNotFoundError('chain-1')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        ApprovalChainNotFoundError
      );
    });

    it('should return success result on chain deactivation', async () => {
      const deactivatedDTO = { ...mockChainDTO, isActive: false } satisfies ApprovalChainDTO;
      mockApprovalChainService.deactivateChain.mockResolvedValueOnce(deactivatedDTO);
      const result = await handler.handle(input);
      expect(result.success).toBe(true);
      expect(result.data?.isActive).toBe(false);
      expect(mockApprovalChainService.deactivateChain).toHaveBeenCalledWith(
        'chain-1',
        'ws-1'
      );
    });
  });

  describe('InitiateWorkflowHandler', () => {
    const handler = new InitiateWorkflowHandler(typedWorkflowService, operationService);
    const input = {
      expenseId: 'exp-1',
      workspaceId: 'ws-1',
      userId: 'user-1',
      authToken: 'Bearer token-1',
    };

    it('should throw UnauthorizedWorkspaceAccessError when actor not authorized', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError()
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
    });

    it('should authorize actor via operation service', async () => {
      mockWorkflowService.initiateWorkflow.mockResolvedValueOnce(mockWorkflowDTO);
      await handler.handle(input);
      expect(mockAuthService.authorize).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          workspaceId: 'ws-1',
          authToken: 'Bearer token-1',
        })
      );
    });

    it('should throw when workflow exists', async () => {
      mockWorkflowService.initiateWorkflow.mockRejectedValueOnce(
        new WorkflowAlreadyExistsError('exp-1')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        WorkflowAlreadyExistsError
      );
    });

    it('should throw when no chain found', async () => {
      mockWorkflowService.initiateWorkflow.mockRejectedValueOnce(
        new NoMatchingApprovalChainError('ws-1', 100)
      );
      await expect(handler.handle(input)).rejects.toThrow(
        NoMatchingApprovalChainError
      );
    });

    it('should return success result on successful initiation', async () => {
      mockWorkflowService.initiateWorkflow.mockResolvedValueOnce(mockWorkflowDTO);
      const result = await handler.handle(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockWorkflowDTO);
    });
  });

  describe('ApproveStepHandler', () => {
    const handler = new ApproveStepHandler(typedWorkflowService, operationService);
    const input = {
      expenseId: 'exp-1',
      workspaceId: 'ws-1',
      approverId: 'user-2',
      expectedStepNumber: 1,
      authToken: 'Bearer token-1',
    };

    it('should throw UnauthorizedWorkspaceAccessError when actor not authorized', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError()
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
    });

    it('should authorize actor via operation service', async () => {
      mockWorkflowService.approveStep.mockResolvedValueOnce(mockWorkflowDTO);
      await handler.handle(input);
      expect(mockAuthService.authorize).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-2',
          workspaceId: 'ws-1',
          authToken: 'Bearer token-1',
        })
      );
    });

    it('should throw when workflow not found', async () => {
      mockWorkflowService.approveStep.mockRejectedValueOnce(
        new WorkflowNotFoundError('exp-1')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        WorkflowNotFoundError
      );
    });

    it('should throw when no current step', async () => {
      mockWorkflowService.approveStep.mockRejectedValueOnce(
        new CurrentStepNotFoundError('exp-1')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        CurrentStepNotFoundError
      );
    });

    it('should throw when approver mismatches', async () => {
      mockWorkflowService.approveStep.mockRejectedValueOnce(
        new UnauthorizedApproverError('user-2', 'step-1')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedApproverError
      );
    });

    it('should return success result on successful approve', async () => {
      const approvedDTO = {
        ...mockWorkflowDTO,
        currentStepNumber: 2,
      } satisfies ExpenseWorkflowDTO;
      mockWorkflowService.approveStep.mockResolvedValueOnce(approvedDTO);
      const result = await handler.handle(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(approvedDTO);
    });

    it('should forward expectedStepNumber to workflow service', async () => {
      const approvedDTO = {
        ...mockWorkflowDTO,
        currentStepNumber: 2,
      } satisfies ExpenseWorkflowDTO;
      mockWorkflowService.approveStep.mockResolvedValueOnce(approvedDTO);
      const result = await handler.handle({
        ...input,
        expectedStepNumber: 1,
      });
      expect(result.success).toBe(true);
      expect(mockWorkflowService.approveStep).toHaveBeenCalledWith(
        expect.objectContaining({ expectedStepNumber: 1 })
      );
    });
  });

  describe('RejectStepHandler', () => {
    const handler = new RejectStepHandler(typedWorkflowService, operationService);
    const input = {
      expenseId: 'exp-1',
      workspaceId: 'ws-1',
      approverId: 'user-2',
      comments: 'Bad expense',
      authToken: 'Bearer token-1',
    };

    it('should throw UnauthorizedWorkspaceAccessError when actor not authorized', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError()
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
    });

    it('should authorize actor via operation service', async () => {
      mockWorkflowService.rejectStep.mockResolvedValueOnce(mockWorkflowDTO);
      await handler.handle(input);
      expect(mockAuthService.authorize).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-2',
          workspaceId: 'ws-1',
          authToken: 'Bearer token-1',
        })
      );
    });

    it('should throw when comments are missing', async () => {
      mockWorkflowService.rejectStep.mockRejectedValueOnce(
        new RejectionReasonRequiredError()
      );
      const inputNoComments = { ...input, comments: '' };
      await expect(handler.handle(inputNoComments)).rejects.toThrow(
        RejectionReasonRequiredError
      );
    });

    it('should return success result on successful reject', async () => {
      const rejectedDTO = {
        ...mockWorkflowDTO,
        status: WorkflowStatus.REJECTED,
      } satisfies ExpenseWorkflowDTO;
      mockWorkflowService.rejectStep.mockResolvedValueOnce(rejectedDTO);
      const result = await handler.handle(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(rejectedDTO);
    });
  });

  describe('DelegateStepHandler', () => {
    const handler = new DelegateStepHandler(typedWorkflowService, operationService);
    const input = {
      expenseId: 'exp-1',
      workspaceId: 'ws-1',
      fromUserId: 'user-2',
      toUserId: 'user-3',
      authToken: 'Bearer token-1',
    };

    it('should throw UnauthorizedWorkspaceAccessError when actor not authorized', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError()
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
    });

    it('should authorize actor via operation service', async () => {
      mockWorkflowService.delegateStep.mockResolvedValueOnce(mockWorkflowDTO);
      await handler.handle(input);
      expect(mockAuthService.authorize).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-2',
          workspaceId: 'ws-1',
          authToken: 'Bearer token-1',
        })
      );
    });

    it('should throw for self-delegation', async () => {
      mockWorkflowService.delegateStep.mockRejectedValueOnce(
        new InvalidDelegationError('Self delegation')
      );
      const inputSelf = { ...input, toUserId: 'user-2' };
      await expect(handler.handle(inputSelf)).rejects.toThrow(
        InvalidDelegationError
      );
    });

    it('should return success result on successful delegation', async () => {
      mockWorkflowService.delegateStep.mockResolvedValueOnce(mockWorkflowDTO);
      const result = await handler.handle(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockWorkflowDTO);
    });
  });

  describe('CancelWorkflowHandler', () => {
    const handler = new CancelWorkflowHandler(typedWorkflowService, operationService);
    const input = {
      expenseId: 'exp-1',
      workspaceId: 'ws-1',
      actorId: 'user-1',
      reason: 'No longer needed',
      authToken: 'Bearer token-1',
    };

    it('should throw UnauthorizedWorkspaceAccessError when actor not authorized', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError()
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
    });

    it('should authorize actor via operation service', async () => {
      mockWorkflowService.cancelWorkflow.mockResolvedValueOnce(mockWorkflowDTO);
      await handler.handle(input);
      expect(mockAuthService.authorize).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          workspaceId: 'ws-1',
          authToken: 'Bearer token-1',
        })
      );
    });

    it('should throw when workflow not found', async () => {
      mockWorkflowService.cancelWorkflow.mockRejectedValueOnce(
        new WorkflowNotFoundError('exp-1')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        WorkflowNotFoundError
      );
    });

    it('should throw when actor is unauthorized', async () => {
      mockWorkflowService.cancelWorkflow.mockRejectedValueOnce(
        new UnauthorizedWorkflowCancellationError('user-2', 'exp-1')
      );
      const unauthorizedInput = { ...input, actorId: 'user-2' };
      await expect(handler.handle(unauthorizedInput)).rejects.toThrow(
        UnauthorizedWorkflowCancellationError
      );
    });

    it('should return success result on successful workflow cancellation', async () => {
      const cancelledDTO = {
        ...mockWorkflowDTO,
        status: WorkflowStatus.CANCELLED,
      } satisfies ExpenseWorkflowDTO;
      mockWorkflowService.cancelWorkflow.mockResolvedValueOnce(cancelledDTO);
      const result = await handler.handle(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(cancelledDTO);
      expect(mockWorkflowService.cancelWorkflow).toHaveBeenCalledWith(
        'exp-1',
        'ws-1',
        'user-1',
        'No longer needed'
      );
    });
  });

  describe('WorkflowService cancelWorkflow Authorization (Finding 2)', () => {
    const mockWorkflowRepo: MockWorkflowRepository = {
      findByExpenseId: vi.fn(),
      save: vi.fn(),
    };
    const mockChainRepo: MockChainRepository = {
      findApplicableChain: vi.fn(),
    };
    const mockAuthService = {
      authorize: vi.fn(),
    };

    const mockSnapshotService = {
      getExpenseSnapshot: vi.fn(),
    };

    const service = new WorkflowService(
      mockWorkflowRepo as unknown as IExpenseWorkflowRepository,
      mockChainRepo as unknown as IApprovalChainRepository,
      mockAuthService as unknown as IWorkspaceAuthorizationService,
      mockSnapshotService
    );

    const expenseIdStr = '44444444-4444-4444-a444-444444444444';
    const workspaceIdStr = '11111111-1111-4111-a111-111111111111';
    const ownerIdStr = '55555555-5555-4555-a555-555555555555';
    const unauthorizedActorId = '99999999-9999-4999-a999-999999999999';

    function createTestWorkflow() {
      return ExpenseWorkflow.fromPersistence({
        workflowId: WorkflowId.fromString('11111111-1111-4111-a111-111111111111'),
        expenseId: ExpenseId.fromString(expenseIdStr),
        workspaceId: WorkspaceId.fromString(workspaceIdStr),
        userId: UserId.fromString(ownerIdStr),
        chainId: ApprovalChainId.fromString('66666666-6666-4666-a666-666666666666'),
        status: WorkflowStatus.IN_PROGRESS,
        currentStepNumber: 1,
        version: 1,
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    it('should throw UnauthorizedWorkflowCancellationError when actor does not match workflow owner', async () => {
      const workflow = createTestWorkflow();
      mockWorkflowRepo.findByExpenseId.mockResolvedValueOnce(workflow);

      await expect(
        service.cancelWorkflow(expenseIdStr, workspaceIdStr, unauthorizedActorId, 'Cancel attempt')
      ).rejects.toThrow(UnauthorizedWorkflowCancellationError);

      expect(mockWorkflowRepo.save).not.toHaveBeenCalled();
    });

    it('should successfully cancel workflow when actor matches workflow owner', async () => {
      const workflow = createTestWorkflow();
      mockWorkflowRepo.findByExpenseId.mockResolvedValueOnce(workflow);
      mockWorkflowRepo.save.mockResolvedValueOnce(undefined);

      const result = await service.cancelWorkflow(
        expenseIdStr,
        workspaceIdStr,
        ownerIdStr,
        'Owner decided to cancel'
      );

      expect(result.status).toBe('cancelled');
      expect(mockWorkflowRepo.save).toHaveBeenCalledWith(workflow);
    });

    it('should throw WorkflowNotFoundError when workflow belongs to different workspace', async () => {
      const workflow = createTestWorkflow();
      mockWorkflowRepo.findByExpenseId.mockResolvedValueOnce(workflow);

      const differentWs = '88888888-8888-4888-a888-888888888888';
      await expect(
        service.cancelWorkflow(expenseIdStr, differentWs, ownerIdStr)
      ).rejects.toThrow(WorkflowNotFoundError);

      expect(mockWorkflowRepo.save).not.toHaveBeenCalled();
    });
  });
});