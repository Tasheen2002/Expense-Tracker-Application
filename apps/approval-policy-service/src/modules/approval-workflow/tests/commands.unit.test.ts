import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InitiateWorkflowHandler } from '../application/commands/initiate-workflow.command';
import { ApproveStepHandler } from '../application/commands/approve-step.command';
import { RejectStepHandler } from '../application/commands/reject-step.command';
import { DelegateStepHandler } from '../application/commands/delegate-step.command';
import {
  WorkflowAlreadyExistsError,
  NoMatchingApprovalChainError,
  WorkflowNotFoundError,
  UnauthorizedApproverError,
  CurrentStepNotFoundError,
  RejectionReasonRequiredError,
  InvalidDelegationError,
} from '../domain/errors/approval-workflow.errors';

// Mock services
const mockWorkflowService = {
  initiateWorkflow: vi.fn(),
  approveStep: vi.fn(),
  rejectStep: vi.fn(),
  delegateStep: vi.fn(),
  cancelWorkflow: vi.fn(),
  getWorkflow: vi.fn(),
  listPendingApprovals: vi.fn(),
  listUserWorkflows: vi.fn(),
};

describe('Approval Workflow Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('InitiateWorkflowHandler', () => {
    const handler = new InitiateWorkflowHandler(mockWorkflowService as any);
    const input = {
      expenseId: 'exp-1',
      workspaceId: 'ws-1',
      userId: 'user-1',
      amount: 100,
      hasReceipt: true,
    };

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
      const mockDTO = {
        workflowId: 'wf-1',
        expenseId: 'exp-1',
        workspaceId: 'ws-1',
        userId: 'user-1',
        status: 'PENDING',
        currentStepNumber: 1,
        steps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockWorkflowService.initiateWorkflow.mockResolvedValueOnce(mockDTO);
      const result = await handler.handle(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDTO);
    });
  });

  describe('ApproveStepHandler', () => {
    const handler = new ApproveStepHandler(mockWorkflowService as any);
    const input = {
      expenseId: 'exp-1',
      workspaceId: 'ws-1',
      approverId: 'user-2',
    };

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
      const mockDTO = {
        workflowId: 'wf-1',
        expenseId: 'exp-1',
        workspaceId: 'ws-1',
        userId: 'user-1',
        status: 'PENDING',
        currentStepNumber: 2,
        steps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockWorkflowService.approveStep.mockResolvedValueOnce(mockDTO);
      const result = await handler.handle(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDTO);
    });
  });

  describe('RejectStepHandler', () => {
    const handler = new RejectStepHandler(mockWorkflowService as any);
    const input = {
      expenseId: 'exp-1',
      workspaceId: 'ws-1',
      approverId: 'user-2',
      comments: 'Bad expense',
    };

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
      const mockDTO = {
        workflowId: 'wf-1',
        expenseId: 'exp-1',
        workspaceId: 'ws-1',
        userId: 'user-1',
        status: 'REJECTED',
        currentStepNumber: 1,
        steps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockWorkflowService.rejectStep.mockResolvedValueOnce(mockDTO);
      const result = await handler.handle(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDTO);
    });
  });

  describe('DelegateStepHandler', () => {
    const handler = new DelegateStepHandler(mockWorkflowService as any);
    const input = {
      expenseId: 'exp-1',
      workspaceId: 'ws-1',
      fromUserId: 'user-2',
      toUserId: 'user-3',
    };

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
      const mockDTO = {
        workflowId: 'wf-1',
        expenseId: 'exp-1',
        workspaceId: 'ws-1',
        userId: 'user-1',
        status: 'PENDING',
        currentStepNumber: 1,
        steps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockWorkflowService.delegateStep.mockResolvedValueOnce(mockDTO);
      const result = await handler.handle(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDTO);
    });
  });
});
