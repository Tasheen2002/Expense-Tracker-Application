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

    it('should return failure result when workflow exists', async () => {
      mockWorkflowService.initiateWorkflow.mockRejectedValueOnce(
        new WorkflowAlreadyExistsError('exp-1')
      );
      const result = await handler.handle(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
      expect(result.statusCode).toBe(409);
    });

    it('should return failure result when no chain found', async () => {
      mockWorkflowService.initiateWorkflow.mockRejectedValueOnce(
        new NoMatchingApprovalChainError('ws-1', 100)
      );
      const result = await handler.handle(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No applicable approval chain found');
      expect(result.statusCode).toBe(400);
    });

    it('should return success result on successful initiation', async () => {
      const mockResult = { workflowId: 'wf-1', expenseId: 'exp-1' };
      mockWorkflowService.initiateWorkflow.mockResolvedValueOnce({
        toJSON: () => mockResult,
      } as any);
      const result = await handler.handle(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
    });
  });

  describe('ApproveStepHandler', () => {
    const handler = new ApproveStepHandler(mockWorkflowService as any);
    const input = {
      expenseId: 'exp-1',
      workspaceId: 'ws-1',
      approverId: 'user-2',
    };

    it('should return failure result when workflow not found', async () => {
      mockWorkflowService.approveStep.mockRejectedValueOnce(
        new WorkflowNotFoundError('exp-1')
      );
      const result = await handler.handle(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      expect(result.statusCode).toBe(404);
    });

    it('should return failure result when no current step', async () => {
      mockWorkflowService.approveStep.mockRejectedValueOnce(
        new CurrentStepNotFoundError('exp-1')
      );
      const result = await handler.handle(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No current step found');
      expect(result.statusCode).toBe(404);
    });

    it('should return failure result when approver mismatches', async () => {
      mockWorkflowService.approveStep.mockRejectedValueOnce(
        new UnauthorizedApproverError('user-2', 'step-1')
      );
      const result = await handler.handle(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not authorized');
      expect(result.statusCode).toBe(403);
    });

    it('should return success result on successful approve', async () => {
      const mockResult = { workflowId: 'wf-1', status: 'APPROVED' };
      mockWorkflowService.approveStep.mockResolvedValueOnce({
        toJSON: () => mockResult,
      } as any);
      const result = await handler.handle(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
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

    it('should return failure result when comments are missing', async () => {
      mockWorkflowService.rejectStep.mockRejectedValueOnce(
        new RejectionReasonRequiredError()
      );
      const inputNoComments = { ...input, comments: '' };
      const result = await handler.handle(inputNoComments);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rejection reason is required');
      expect(result.statusCode).toBe(400);
    });

    it('should return success result on successful reject', async () => {
      const mockResult = { workflowId: 'wf-1', status: 'REJECTED' };
      mockWorkflowService.rejectStep.mockResolvedValueOnce({
        toJSON: () => mockResult,
      } as any);
      const result = await handler.handle(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
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

    it('should return failure result for self-delegation', async () => {
      mockWorkflowService.delegateStep.mockRejectedValueOnce(
        new InvalidDelegationError('Self delegation')
      );
      const inputSelf = { ...input, toUserId: 'user-2' };
      const result = await handler.handle(inputSelf);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Self delegation');
      expect(result.statusCode).toBe(400);
    });

    it('should return success result on successful delegation', async () => {
      const mockResult = { workflowId: 'wf-1', currentApproverId: 'user-3' };
      mockWorkflowService.delegateStep.mockResolvedValueOnce({
        toJSON: () => mockResult,
      } as any);
      const result = await handler.handle(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
    });
  });
});
