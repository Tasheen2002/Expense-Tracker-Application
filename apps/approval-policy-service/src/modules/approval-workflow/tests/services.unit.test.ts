import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ApprovalChainService,
  WorkflowService,
  OperationService,
} from '../application/services';
import { IApprovalChainRepository } from '../domain/repositories/approval-chain.repository';
import { IExpenseWorkflowRepository } from '../domain/repositories/expense-workflow.repository';
import { IWorkspaceAuthorizationService } from '../../../shared/ports/workspace-authorization.port';
import { ApprovalChain } from '../domain/entities/approval-chain.entity';
import { ExpenseWorkflow } from '../domain/entities/expense-workflow.entity';
import { WorkflowStatus } from '../domain/enums/workflow-status';
import { ApprovalStatus } from '../domain/enums/approval-status';
import {
  ApprovalChainNotFoundError,
  WorkflowNotFoundError,
  WorkflowAlreadyExistsError,
  NoMatchingApprovalChainError,
  SelfApprovalNotAllowedError,
  WorkflowAlreadyCompletedError,
  UnauthorizedApproverError,
  UnauthorizedWorkflowCancellationError,
  UnauthorizedWorkflowViewError,
  WorkflowStepMismatchError,
  ApprovalChainInUseError,
} from '../domain/errors/approval-workflow.errors';
import { UnauthorizedWorkspaceAccessError } from '../../../shared/errors/workspace-authorization.error';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';

// Strongly typed mock repository interfaces
interface MockChainRepository {
  save: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
  findByWorkspaceId: ReturnType<typeof vi.fn>;
  findActiveByWorkspaceId: ReturnType<typeof vi.fn>;
  findApplicableChain: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  exists: ReturnType<typeof vi.fn>;
  countByWorkspaceId: ReturnType<typeof vi.fn>;
  hasReferencingWorkflows: ReturnType<typeof vi.fn>;
}

interface MockWorkflowRepository {
  save: ReturnType<typeof vi.fn>;
  findByExpenseId: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
  findByWorkspaceId: ReturnType<typeof vi.fn>;
  findByUserId: ReturnType<typeof vi.fn>;
  findPendingByApproverId: ReturnType<typeof vi.fn>;
  countByWorkspaceId: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

interface MockWorkspaceAuthService {
  authorize: ReturnType<typeof vi.fn>;
}

describe('Approval Workflow Application Services', () => {
  const wsId = '11111111-1111-4111-a111-111111111111';
  const otherWsId = '22222222-2222-4222-a222-222222222222';
  const chainId = '33333333-3333-4333-a333-333333333333';
  const expenseId = '44444444-4444-4444-a444-444444444444';
  const requesterId = '55555555-5555-4555-a555-555555555555';
  const approverId1 = '66666666-6666-4666-a666-666666666666';
  const approverId2 = '77777777-7777-4777-a777-777777777777';
  const delegateId = '88888888-8888-4888-a888-888888888888';

  let mockChainRepo: MockChainRepository;
  let mockWorkflowRepo: MockWorkflowRepository;
  let mockAuthService: MockWorkspaceAuthService;
  let mockSnapshotService: any;

  let chainService: ApprovalChainService;
  let workflowService: WorkflowService;
  let operationService: OperationService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockChainRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findByWorkspaceId: vi.fn(),
      findActiveByWorkspaceId: vi.fn(),
      findApplicableChain: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(),
      countByWorkspaceId: vi.fn(),
      hasReferencingWorkflows: vi.fn().mockResolvedValue(false),
    };

    mockWorkflowRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findByExpenseId: vi.fn(),
      findById: vi.fn(),
      findByWorkspaceId: vi.fn(),
      findByUserId: vi.fn(),
      findPendingByApproverId: vi.fn(),
      countByWorkspaceId: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    mockAuthService = {
      authorize: vi.fn().mockResolvedValue({
        userId: requesterId,
        workspaceId: wsId,
        role: 'MEMBER',
      }),
    };

    chainService = new ApprovalChainService(
      mockChainRepo as unknown as IApprovalChainRepository,
      mockAuthService as unknown as IWorkspaceAuthorizationService
    );
    mockSnapshotService = {
      getExpenseSnapshot: vi.fn().mockImplementation(async (input: any) => ({
        expenseId: input.expenseId,
        workspaceId: input.workspaceId,
        userId: input.userId,
        amount: 500,
        hasReceipt: true,
        status: 'SUBMITTED',
      })),
    };

    workflowService = new WorkflowService(
      mockWorkflowRepo as unknown as IExpenseWorkflowRepository,
      mockChainRepo as unknown as IApprovalChainRepository,
      mockAuthService as unknown as IWorkspaceAuthorizationService,
      mockSnapshotService
    );
    operationService = new OperationService(
      mockAuthService as unknown as IWorkspaceAuthorizationService
    );
  });

  function createTestChain(overrides: Partial<Parameters<typeof ApprovalChain.create>[0]> = {}) {
    return ApprovalChain.create({
      workspaceId: wsId,
      name: 'General Policy Chain',
      description: 'Standard chain',
      minAmount: 0,
      maxAmount: 5000,
      requiresReceipt: true,
      approverSequence: [approverId1, approverId2],
      ...overrides,
    });
  }

  function createTestWorkflow(overrides: Partial<Parameters<typeof ExpenseWorkflow.create>[0]> = {}) {
    return ExpenseWorkflow.create({
      expenseId,
      workspaceId: wsId,
      userId: requesterId,
      chainId,
      approverSequence: [approverId1, approverId2],
      ...overrides,
    });
  }

  // ==========================================================================
  // 1. APPROVAL CHAIN SERVICE
  // ==========================================================================
  describe('ApprovalChainService', () => {
    it('should create and save an approval chain', async () => {
      const result = await chainService.createChain({
        workspaceId: wsId,
        name: 'Finance Approval',
        description: 'Finance dept',
        minAmount: 50,
        maxAmount: 2500,
        requiresReceipt: true,
        approverSequence: [approverId1],
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Finance Approval');
      expect(result.workspaceId).toBe(wsId);
      expect(result.isActive).toBe(true);
      expect(mockChainRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should forward authToken to workspace authorization service when creating chain', async () => {
      const authToken = 'Bearer valid-jwt-token';
      await chainService.createChain({
        workspaceId: wsId,
        name: 'Chain with Auth',
        requiresReceipt: true,
        approverSequence: [approverId1],
        authToken,
      });

      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: approverId1,
        workspaceId: wsId,
        authToken,
      });
    });

    it('should update approval chain fields successfully', async () => {
      const chain = createTestChain();
      mockChainRepo.findById.mockResolvedValueOnce(chain);

      const result = await chainService.updateChain({
        chainId: chain.id.getValue(),
        workspaceId: wsId,
        name: 'Updated Finance Name',
        description: 'New Description',
        minAmount: 100,
        maxAmount: 3000,
        requiresReceipt: false,
        approverSequence: [approverId2],
      });

      expect(result.name).toBe('Updated Finance Name');
      expect(result.description).toBe('New Description');
      expect(result.minAmount).toBe(100);
      expect(result.maxAmount).toBe(3000);
      expect(result.requiresReceipt).toBe(false);
      expect(result.approverSequence).toEqual([approverId2]);
      expect(mockChainRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should throw ApprovalChainNotFoundError when updating non-existent chain', async () => {
      mockChainRepo.findById.mockResolvedValueOnce(null);

      await expect(
        chainService.updateChain({
          chainId,
          workspaceId: wsId,
          name: 'New Name',
        })
      ).rejects.toThrow(ApprovalChainNotFoundError);
    });

    it('should throw ApprovalChainNotFoundError when updating chain of another workspace', async () => {
      const chain = createTestChain({ workspaceId: otherWsId });
      mockChainRepo.findById.mockResolvedValueOnce(chain);

      await expect(
        chainService.updateChain({
          chainId: chain.id.getValue(),
          workspaceId: wsId,
          name: 'Cross-Tenant Tamper',
        })
      ).rejects.toThrow(ApprovalChainNotFoundError);
    });

    it('should get chain by ID supporting both object and positional params', async () => {
      const chain = createTestChain();
      mockChainRepo.findById.mockResolvedValue(chain);

      const res1 = await chainService.getChain(chain.id.getValue(), wsId);
      expect(res1.chainId).toBe(chain.id.getValue());

      const res2 = await chainService.getChain({ chainId: chain.id.getValue(), workspaceId: wsId });
      expect(res2.chainId).toBe(chain.id.getValue());
    });

    it('should list all chains or active chains with pagination', async () => {
      const chain = createTestChain();
      const paginated: PaginatedResult<ApprovalChain> = {
        items: [chain],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      mockChainRepo.findByWorkspaceId.mockResolvedValueOnce(paginated);
      const allResult = await chainService.listChains(wsId, false, { limit: 10, offset: 0 });
      expect(allResult.items).toHaveLength(1);
      expect(mockChainRepo.findByWorkspaceId).toHaveBeenCalled();

      mockChainRepo.findActiveByWorkspaceId.mockResolvedValueOnce(paginated);
      const activeResult = await chainService.listChains({
        workspaceId: wsId,
        activeOnly: true,
        options: { limit: 10, offset: 0 },
      });
      expect(activeResult.items).toHaveLength(1);
      expect(mockChainRepo.findActiveByWorkspaceId).toHaveBeenCalled();
    });

    it('should activate a deactivated chain', async () => {
      const chain = createTestChain();
      chain.deactivate();
      expect(chain.isActive).toBe(false);
      mockChainRepo.findById.mockResolvedValueOnce(chain);

      const result = await chainService.activateChain(chain.id.getValue(), wsId);
      expect(result.isActive).toBe(true);
      expect(mockChainRepo.save).toHaveBeenCalled();
    });

    it('should deactivate an active chain', async () => {
      const chain = createTestChain();
      mockChainRepo.findById.mockResolvedValueOnce(chain);

      const result = await chainService.deactivateChain({ chainId: chain.id.getValue(), workspaceId: wsId });
      expect(result.isActive).toBe(false);
      expect(mockChainRepo.save).toHaveBeenCalled();
    });

    it('should delete chain when not referenced by workflows', async () => {
      const chain = createTestChain();
      mockChainRepo.findById.mockResolvedValueOnce(chain);
      mockChainRepo.hasReferencingWorkflows.mockResolvedValueOnce(false);

      await chainService.deleteChain(chain.id.getValue(), wsId);
      expect(mockChainRepo.delete).toHaveBeenCalledWith(chain);
    });

    it('should throw ApprovalChainInUseError when deleting chain with referencing workflows', async () => {
      const chain = createTestChain();
      mockChainRepo.findById.mockResolvedValueOnce(chain);
      mockChainRepo.hasReferencingWorkflows.mockResolvedValueOnce(true);

      await expect(
        chainService.deleteChain(chain.id.getValue(), wsId)
      ).rejects.toThrow(ApprovalChainInUseError);
      expect(mockChainRepo.delete).not.toHaveBeenCalled();
    });

    it('should preserve omitted bound when updating only minAmount or maxAmount', async () => {
      const chain = ApprovalChain.create({
        workspaceId: wsId,
        name: 'Bound Test Chain',
        minAmount: 100,
        maxAmount: 1000,
        requiresReceipt: false,
        approverSequence: [approverId1],
      });
      mockChainRepo.findById.mockResolvedValue(chain);

      // 1. Update only minAmount -> maxAmount 1000 must be preserved
      const updatedMin = await chainService.updateChain({
        chainId: chain.id.getValue(),
        workspaceId: wsId,
        minAmount: 200,
      });
      expect(updatedMin.minAmount).toBe(200);
      expect(updatedMin.maxAmount).toBe(1000);

      // 2. Update only maxAmount -> minAmount 200 must be preserved
      const updatedMax = await chainService.updateChain({
        chainId: chain.id.getValue(),
        workspaceId: wsId,
        maxAmount: 800,
      });
      expect(updatedMax.minAmount).toBe(200);
      expect(updatedMax.maxAmount).toBe(800);

      // 3. Explicitly clear maxAmount with null -> becomes unbounded
      const clearedMax = await chainService.updateChain({
        chainId: chain.id.getValue(),
        workspaceId: wsId,
        maxAmount: null,
      });
      expect(clearedMax.minAmount).toBe(200);
      expect(clearedMax.maxAmount).toBeUndefined();
    });

    it('should throw UnauthorizedWorkspaceAccessError when creating or updating chain with non-member approver', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('User is not a member')
      );

      await expect(
        chainService.createChain({
          workspaceId: wsId,
          name: 'Non Member Chain',
          requiresReceipt: false,
          approverSequence: ['non-member-id'],
        })
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);

      const chain = createTestChain();
      mockChainRepo.findById.mockResolvedValueOnce(chain);
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('User is not a member')
      );

      await expect(
        chainService.updateChain({
          chainId: chain.id.getValue(),
          workspaceId: wsId,
          approverSequence: ['non-member-id'],
        })
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
    });

    it('should find applicable chain using criteria', async () => {
      const chain = createTestChain();
      mockChainRepo.findApplicableChain.mockResolvedValueOnce(chain);

      const result = await chainService.findApplicableChain({
        workspaceId: wsId,
        amount: 500,
        hasReceipt: true,
      });

      expect(result).toBeDefined();
      expect(result?.chainId).toBe(chain.id.getValue());
    });
  });

  // ==========================================================================
  // 2. WORKFLOW SERVICE
  // ==========================================================================
  describe('WorkflowService', () => {
    it('should throw WorkflowAlreadyExistsError when workflow for expense already exists', async () => {
      const workflow = createTestWorkflow();
      mockWorkflowRepo.findByExpenseId.mockResolvedValueOnce(workflow);

      await expect(
        workflowService.initiateWorkflow({
          expenseId,
          workspaceId: wsId,
          userId: requesterId,
        })
      ).rejects.toThrow(WorkflowAlreadyExistsError);
    });

    it('should throw NoMatchingApprovalChainError when no chain matches expense criteria', async () => {
      mockWorkflowRepo.findByExpenseId.mockResolvedValueOnce(null);
      mockChainRepo.findApplicableChain.mockResolvedValueOnce(null);

      await expect(
        workflowService.initiateWorkflow({
          expenseId,
          workspaceId: wsId,
          userId: requesterId,
        })
      ).rejects.toThrow(NoMatchingApprovalChainError);
    });

    it('should throw SelfApprovalNotAllowedError when requester is in the approver sequence', async () => {
      mockWorkflowRepo.findByExpenseId.mockResolvedValueOnce(null);
      const chainWithRequester = createTestChain({
        approverSequence: [requesterId, approverId1],
      });
      mockChainRepo.findApplicableChain.mockResolvedValueOnce(chainWithRequester);

      await expect(
        workflowService.initiateWorkflow({
          expenseId,
          workspaceId: wsId,
          userId: requesterId,
        })
      ).rejects.toThrow(SelfApprovalNotAllowedError);
    });

    it('should auto-approve workflow when amount is below or equal to AUTO_APPROVAL_THRESHOLD (50)', async () => {
      mockWorkflowRepo.findByExpenseId.mockResolvedValueOnce(null);
      const chain = createTestChain();
      mockChainRepo.findApplicableChain.mockResolvedValueOnce(chain);
      mockSnapshotService.getExpenseSnapshot.mockResolvedValueOnce({
        expenseId,
        workspaceId: wsId,
        userId: requesterId,
        amount: 45,
        hasReceipt: true,
        status: 'SUBMITTED',
      });

      const result = await workflowService.initiateWorkflow({
        expenseId,
        workspaceId: wsId,
        userId: requesterId,
      });

      expect(result.status).toBe(WorkflowStatus.APPROVED);
      expect(result.steps.every((s) => s.status === ApprovalStatus.AUTO_APPROVED)).toBe(true);
      expect(mockWorkflowRepo.save).toHaveBeenCalled();
    });

    it('should start workflow with PENDING status when amount exceeds AUTO_APPROVAL_THRESHOLD', async () => {
      mockWorkflowRepo.findByExpenseId.mockResolvedValueOnce(null);
      const chain = createTestChain();
      mockChainRepo.findApplicableChain.mockResolvedValueOnce(chain);

      const result = await workflowService.initiateWorkflow({
        expenseId,
        workspaceId: wsId,
        userId: requesterId,
      });

      expect(result.status).toBe(WorkflowStatus.IN_PROGRESS);
      expect(result.steps[0].status).toBe(ApprovalStatus.PENDING);
      expect(mockWorkflowRepo.save).toHaveBeenCalled();
    });

    it('should get workflow supporting both positional and object params', async () => {
      const workflow = createTestWorkflow();
      mockWorkflowRepo.findByExpenseId.mockResolvedValue(workflow);

      const res1 = await workflowService.getWorkflow(expenseId, wsId);
      expect(res1.expenseId).toBe(expenseId);

      const res2 = await workflowService.getWorkflow({ expenseId, workspaceId: wsId });
      expect(res2.expenseId).toBe(expenseId);
    });

    it('should throw WorkflowNotFoundError when workflow belongs to another workspace', async () => {
      const workflow = createTestWorkflow({ workspaceId: otherWsId });
      mockWorkflowRepo.findByExpenseId.mockResolvedValueOnce(workflow);

      await expect(workflowService.getWorkflow(expenseId, wsId)).rejects.toThrow(
        WorkflowNotFoundError
      );
    });

    it('should approve current step and advance to next step', async () => {
      const workflow = createTestWorkflow();
      workflow.start();
      mockWorkflowRepo.findByExpenseId.mockResolvedValueOnce(workflow);

      const result = await workflowService.approveStep({
        expenseId,
        workspaceId: wsId,
        approverId: approverId1,
        expectedStepNumber: 1,
        comments: 'Step 1 approved',
      });

      expect(result.steps[0].status).toBe(ApprovalStatus.APPROVED);
      expect(result.currentStepNumber).toBe(2);
      expect(result.status).toBe(WorkflowStatus.IN_PROGRESS);
      expect(mockWorkflowRepo.save).toHaveBeenCalled();
    });

    it('should throw WorkflowAlreadyCompletedError if workflow is already completed and step was not approved by caller', async () => {
      const workflow = createTestWorkflow();
      workflow.start();
      workflow.approveCurrentStep();
      workflow.approveCurrentStep();
      expect(workflow.isCompleted()).toBe(true);
      mockWorkflowRepo.findByExpenseId.mockResolvedValueOnce(workflow);

      await expect(
        workflowService.approveStep({
          expenseId,
          workspaceId: wsId,
          approverId: approverId2,
          expectedStepNumber: 1, // Step 1 was approved by approverId1, not approverId2
        })
      ).rejects.toThrow(WorkflowAlreadyCompletedError);
    });

    it('should be idempotent if approver retries an already approved intermediate step', async () => {
      const workflow = createTestWorkflow();
      workflow.start();
      workflow.approveCurrentStep('First approval');
      mockWorkflowRepo.findByExpenseId.mockResolvedValueOnce(workflow);

      const result = await workflowService.approveStep({
        expenseId,
        workspaceId: wsId,
        approverId: approverId1,
        expectedStepNumber: 1,
      });

      expect(result.steps[0].status).toBe(ApprovalStatus.APPROVED);
      expect(mockWorkflowRepo.save).not.toHaveBeenCalled();
    });

    it('should be idempotent if approver retries the final step on an already completed workflow', async () => {
      const workflow = createTestWorkflow();
      workflow.start();
      workflow.approveCurrentStep('First approval');
      workflow.approveCurrentStep('Final approval');
      expect(workflow.isCompleted()).toBe(true);
      mockWorkflowRepo.findByExpenseId.mockResolvedValueOnce(workflow);

      const result = await workflowService.approveStep({
        expenseId,
        workspaceId: wsId,
        approverId: approverId2,
        expectedStepNumber: 2,
      });

      expect(result.status).toBe(WorkflowStatus.APPROVED);
      expect(result.steps[1].status).toBe(ApprovalStatus.APPROVED);
      expect(mockWorkflowRepo.save).not.toHaveBeenCalled();
    });

    it('should throw WorkflowStepMismatchError if expectedStepNumber does not match current step', async () => {
      const workflow = createTestWorkflow();
      workflow.start();
      mockWorkflowRepo.findByExpenseId.mockResolvedValueOnce(workflow);

      await expect(
        workflowService.approveStep({
          expenseId,
          workspaceId: wsId,
          approverId: approverId1,
          expectedStepNumber: 2,
        })
      ).rejects.toThrow(WorkflowStepMismatchError);
    });

    it('should reject workflow when current approver rejects', async () => {
      const workflow = createTestWorkflow();
      workflow.start();
      mockWorkflowRepo.findByExpenseId.mockResolvedValueOnce(workflow);

      const result = await workflowService.rejectStep({
        expenseId,
        workspaceId: wsId,
        approverId: approverId1,
        comments: 'Missing invoice documentation',
      });

      expect(result.status).toBe(WorkflowStatus.REJECTED);
      expect(result.steps[0].status).toBe(ApprovalStatus.REJECTED);
      expect(mockWorkflowRepo.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedApproverError when unauthorized user attempts to approve or reject', async () => {
      const workflow = createTestWorkflow();
      workflow.start();
      mockWorkflowRepo.findByExpenseId.mockResolvedValue(workflow);

      await expect(
        workflowService.approveStep({
          expenseId,
          workspaceId: wsId,
          approverId: 'random-user',
          expectedStepNumber: 1,
        })
      ).rejects.toThrow(UnauthorizedApproverError);

      await expect(
        workflowService.rejectStep({
          expenseId,
          workspaceId: wsId,
          approverId: 'random-user',
          comments: 'No permission',
        })
      ).rejects.toThrow(UnauthorizedApproverError);
    });

    it('should delegate current step and reject delegation back to requester', async () => {
      const workflow = createTestWorkflow();
      workflow.start();
      mockWorkflowRepo.findByExpenseId.mockResolvedValue(workflow);

      // Self-approval delegation rejection
      await expect(
        workflowService.delegateStep({
          expenseId,
          workspaceId: wsId,
          fromUserId: approverId1,
          toUserId: requesterId,
        })
      ).rejects.toThrow(SelfApprovalNotAllowedError);

      // Successful delegation to third party
      const result = await workflowService.delegateStep({
        expenseId,
        workspaceId: wsId,
        fromUserId: approverId1,
        toUserId: delegateId,
      });

      expect(result.steps[0].delegatedTo).toBe(delegateId);
      expect(mockWorkflowRepo.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedWorkspaceAccessError when delegating to user outside workspace', async () => {
      const workflow = createTestWorkflow();
      workflow.start();
      mockWorkflowRepo.findByExpenseId.mockResolvedValueOnce(workflow);
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('User not in workspace')
      );

      await expect(
        workflowService.delegateStep({
          expenseId,
          workspaceId: wsId,
          fromUserId: approverId1,
          toUserId: 'outside-workspace-user',
        })
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
    });

    it('should forward authToken to workspace authorization service when delegating step', async () => {
      const workflow = createTestWorkflow();
      workflow.start();
      mockWorkflowRepo.findByExpenseId.mockResolvedValue(workflow);
      const authToken = 'Bearer valid-jwt-token';

      await workflowService.delegateStep({
        expenseId,
        workspaceId: wsId,
        fromUserId: approverId1,
        toUserId: delegateId,
        authToken,
      });

      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: delegateId,
        workspaceId: wsId,
        authToken,
      });
    });

    it('should prevent network retry from advancing step 2 when step 1 was delegated to step 2 approver and expectedStepNumber is used', async () => {
      const workflow = createTestWorkflow(); // step 1: approverId1, step 2: approverId2
      workflow.start();
      // Delegate step 1 to approverId2 (who is also the step 2 approver)
      workflow.delegateCurrentStep(approverId2);
      mockWorkflowRepo.findByExpenseId.mockResolvedValue(workflow);

      // First call: approverId2 approves step 1 with expectedStepNumber: 1
      const firstResult = await workflowService.approveStep({
        expenseId,
        workspaceId: wsId,
        approverId: approverId2,
        comments: 'Approved step 1',
        expectedStepNumber: 1,
      });

      expect(firstResult.steps[0].status).toBe(ApprovalStatus.APPROVED);
      expect(firstResult.currentStepNumber).toBe(2);
      expect(mockWorkflowRepo.save).toHaveBeenCalledTimes(1);

      // Network retry sends identical request with expectedStepNumber: 1
      const retryResult = await workflowService.approveStep({
        expenseId,
        workspaceId: wsId,
        approverId: approverId2,
        comments: 'Approved step 1',
        expectedStepNumber: 1,
      });

      // Must idempotently return workflow WITHOUT approving step 2
      expect(retryResult.currentStepNumber).toBe(2);
      expect(retryResult.steps[1].status).toBe(ApprovalStatus.PENDING);
      expect(mockWorkflowRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should throw WorkflowStepMismatchError when expectedStepNumber does not match current step and was not previously approved', async () => {
      const workflow = createTestWorkflow();
      workflow.start();
      mockWorkflowRepo.findByExpenseId.mockResolvedValueOnce(workflow);

      await expect(
        workflowService.approveStep({
          expenseId,
          workspaceId: wsId,
          approverId: approverId1,
          expectedStepNumber: 2, // workflow is currently at step 1
        })
      ).rejects.toThrow(WorkflowStepMismatchError);
    });

    it('should cancel workflow supporting both positional and object params', async () => {
      const workflow = createTestWorkflow();
      workflow.start();
      mockWorkflowRepo.findByExpenseId.mockResolvedValue(workflow);

      const result = await workflowService.cancelWorkflow({
        expenseId,
        workspaceId: wsId,
        actorId: requesterId,
        reason: 'Duplicate expense submission',
      });

      expect(result.status).toBe(WorkflowStatus.CANCELLED);
      expect(mockWorkflowRepo.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedWorkflowCancellationError when non-requester attempts cancellation', async () => {
      const workflow = createTestWorkflow();
      workflow.start();
      mockWorkflowRepo.findByExpenseId.mockResolvedValueOnce(workflow);

      const otherUserId = '99999999-9999-4999-a999-999999999999';
      await expect(
        workflowService.cancelWorkflow(expenseId, wsId, otherUserId)
      ).rejects.toThrow(UnauthorizedWorkflowCancellationError);
    });

    it('should list pending approvals and user workflows with pagination', async () => {
      const workflow = createTestWorkflow();
      const paginated: PaginatedResult<ExpenseWorkflow> = {
        items: [workflow],
        total: 1,
        limit: 15,
        offset: 0,
        hasMore: false,
      };

      mockWorkflowRepo.findPendingByApproverId.mockResolvedValueOnce(paginated);
      const pendingRes = await workflowService.listPendingApprovals(approverId1, wsId, { limit: 15, offset: 0 });
      expect(pendingRes.items).toHaveLength(1);

      mockWorkflowRepo.findByUserId.mockResolvedValueOnce(paginated);
      const userRes = await workflowService.listUserWorkflows({
        userId: requesterId,
        workspaceId: wsId,
        options: { limit: 15, offset: 0 },
      });
      expect(userRes.items).toHaveLength(1);
    });
  });

  // ==========================================================================
  // 3. OPERATION SERVICE
  // ==========================================================================
  describe('OperationService', () => {
    it('should throw UnauthorizedWorkspaceAccessError when actorId or workspaceId is missing', async () => {
      await expect(
        operationService.authorize({ actorId: '', workspaceId: wsId })
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);

      await expect(
        operationService.authorize({ actorId: requesterId, workspaceId: '' })
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
    });

    it('should execute work within authorized context', async () => {
      const result = await operationService.execute(
        { actorId: requesterId, workspaceId: wsId },
        async () => 'computation-complete'
      );

      expect(result).toBe('computation-complete');
      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: requesterId,
        workspaceId: wsId,
        requiredRole: undefined,
      });
    });

    it('should authorize self-lookup with standard membership and cross-user lookup with ADMIN role', async () => {
      await operationService.authorizeUserLookup(requesterId, wsId, requesterId);
      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: requesterId,
        workspaceId: wsId,
        requiredRole: undefined,
      });

      await operationService.authorizeUserLookup(requesterId, wsId, 'target-user');
      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: requesterId,
        workspaceId: wsId,
        requiredRole: 'ADMIN',
      });
    });

    it('should correctly authorize workflow visibility', () => {
      const sampleWorkflow = {
        userId: requesterId,
        expenseId,
        steps: [{ approverId: approverId1, delegatedTo: delegateId }],
      };

      // Requester allowed
      expect(() =>
        operationService.authorizeWorkflowVisibility(requesterId, { userId: requesterId, workspaceId: wsId, role: 'MEMBER' }, sampleWorkflow)
      ).not.toThrow();

      // Approver allowed
      expect(() =>
        operationService.authorizeWorkflowVisibility(approverId1, { userId: approverId1, workspaceId: wsId, role: 'MEMBER' }, sampleWorkflow)
      ).not.toThrow();

      // Delegated approver allowed
      expect(() =>
        operationService.authorizeWorkflowVisibility(delegateId, { userId: delegateId, workspaceId: wsId, role: 'MEMBER' }, sampleWorkflow)
      ).not.toThrow();

      // Admin allowed even if neither
      expect(() =>
        operationService.authorizeWorkflowVisibility('admin-user', { userId: 'admin-user', workspaceId: wsId, role: 'ADMIN' }, sampleWorkflow)
      ).not.toThrow();

      // Owner allowed even if neither
      expect(() =>
        operationService.authorizeWorkflowVisibility('owner-user', { userId: 'owner-user', workspaceId: wsId, role: 'OWNER' }, sampleWorkflow)
      ).not.toThrow();

      // Unrelated member rejected
      expect(() =>
        operationService.authorizeWorkflowVisibility('unrelated-user', { userId: 'unrelated-user', workspaceId: wsId, role: 'MEMBER' }, sampleWorkflow)
      ).toThrow(UnauthorizedWorkflowViewError);
    });

    it('should authorize user lookup with case-insensitive UUID matching', async () => {
      const lowerId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
      const upperId = 'AAAAAAAA-AAAA-4AAA-AAAA-AAAAAAAAAAAA';

      await operationService.authorizeUserLookup(lowerId, wsId, upperId);
      expect(mockAuthService.authorize).toHaveBeenCalledWith({
        userId: lowerId,
        workspaceId: wsId,
        requiredRole: undefined, // treated as self
      });
    });

    it('should authorize workflow visibility with case-insensitive UUID matching', () => {
      const lowerRequester = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
      const upperRequester = 'AAAAAAAA-AAAA-4AAA-AAAA-AAAAAAAAAAAA';
      const sampleWorkflow = {
        userId: lowerRequester,
        expenseId,
        steps: [],
      };

      expect(() =>
        operationService.authorizeWorkflowVisibility(
          upperRequester,
          { userId: upperRequester, workspaceId: wsId, role: 'MEMBER' },
          sampleWorkflow
        )
      ).not.toThrow();
    });
  });
});
