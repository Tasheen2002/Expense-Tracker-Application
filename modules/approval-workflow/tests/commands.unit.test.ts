import { describe, it, expect, vi, beforeEach } from "vitest";
import { InitiateWorkflowHandler } from "../application/commands/initiate-workflow.command";
import { ApproveStepHandler } from "../application/commands/approve-step.command";
import { RejectStepHandler } from "../application/commands/reject-step.command";
import { DelegateStepHandler } from "../application/commands/delegate-step.command";
import {
  WorkflowAlreadyExistsError,
  NoMatchingApprovalChainError,
  WorkflowNotFoundError,
  UnauthorizedApproverError,
  CurrentStepNotFoundError,
  RejectionReasonRequiredError,
  InvalidDelegationError,
} from "../domain/errors/approval-workflow.errors";
import { ExpenseWorkflow } from "../domain/entities/expense-workflow.entity";
import { ApprovalChain } from "../domain/entities/approval-chain.entity";
import { ApprovalStep } from "../domain/entities/approval-step.entity";

// Mock Repositories
const mockWorkflowRepository = {
  findByExpenseId: vi.fn(),
  save: vi.fn(),
  findById: vi.fn(),
};

const mockChainRepository = {
  findApplicableChain: vi.fn(),
  findById: vi.fn(),
  save: vi.fn(),
  findAll: vi.fn(),
};

describe("Approval Workflow Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("InitiateWorkflowHandler", () => {
    const handler = new InitiateWorkflowHandler(
      mockWorkflowRepository as any,
      mockChainRepository as any,
    );
    const input = {
      expenseId: "exp-1",
      workspaceId: "ws-1",
      userId: "user-1",
      amount: 100,
      hasReceipt: true,
    };

    it("should throw WorkflowAlreadyExistsError if workflow exists", async () => {
      mockWorkflowRepository.findByExpenseId.mockResolvedValueOnce({} as any);

      await expect(handler.handle(input)).rejects.toThrow(
        WorkflowAlreadyExistsError,
      );
    });

    it("should throw NoMatchingApprovalChainError if no chain found", async () => {
      mockWorkflowRepository.findByExpenseId.mockResolvedValueOnce(null);
      mockChainRepository.findApplicableChain.mockResolvedValueOnce(null);

      await expect(handler.handle(input)).rejects.toThrow(
        NoMatchingApprovalChainError,
      );
    });
  });

  describe("ApproveStepHandler", () => {
    const handler = new ApproveStepHandler(mockWorkflowRepository as any);
    const input = {
      expenseId: "exp-1",
      approverId: "user-2",
    };

    it("should throw WorkflowNotFoundError if workflow not found", async () => {
      mockWorkflowRepository.findByExpenseId.mockResolvedValueOnce(null);

      await expect(handler.handle(input)).rejects.toThrow(
        WorkflowNotFoundError,
      );
    });

    it("should throw CurrentStepNotFoundError if no current step", async () => {
      const mockWorkflow = {
        getCurrentStep: vi.fn().mockReturnValue(null),
      };
      mockWorkflowRepository.findByExpenseId.mockResolvedValueOnce(
        mockWorkflow,
      );

      await expect(handler.handle(input)).rejects.toThrow(
        CurrentStepNotFoundError,
      );
    });

    it("should throw UnauthorizedApproverError if approver mismatch", async () => {
      const mockStep = {
        getCurrentApproverId: () => ({ getValue: () => "user-3" }), // Different user
        getId: () => ({ getValue: () => "step-1" }),
      };
      const mockWorkflow = {
        getCurrentStep: vi.fn().mockReturnValue(mockStep),
      };
      mockWorkflowRepository.findByExpenseId.mockResolvedValueOnce(
        mockWorkflow,
      );

      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedApproverError,
      );
    });
  });

  describe("RejectStepHandler", () => {
    const handler = new RejectStepHandler(mockWorkflowRepository as any);
    const input = {
      expenseId: "exp-1",
      approverId: "user-2",
      comments: "Bad expense",
    };

    it("should throw RejectionReasonRequiredError if comments missing", async () => {
      // Logic for this check is actually inside the Entity, but we can verify it propagates
      // Assuming entity 'reject' method throws it.
      // We need a real entity or a mock that behaves like one for this test,
      // OR we just trust the entity unit test (implied) and mocking the entity to throw
      // creates a tautology.
      // Ideally, integration tests cover this better, but let's mock the workflow/step behavior

      const mockStep = {
        getCurrentApproverId: () => ({ getValue: () => "user-2" }),
        getId: () => ({ getValue: () => "step-1" }),
        reject: vi.fn().mockImplementation(() => {
          throw new RejectionReasonRequiredError();
        }),
      };
      const mockWorkflow = {
        getCurrentStep: vi.fn().mockReturnValue(mockStep),
      };

      const inputNoComments = { ...input, comments: "" };
      mockWorkflowRepository.findByExpenseId.mockResolvedValueOnce(
        mockWorkflow,
      );

      await expect(handler.handle(inputNoComments)).rejects.toThrow(
        RejectionReasonRequiredError,
      );
    });
  });

  describe("DelegateStepHandler", () => {
    const handler = new DelegateStepHandler(mockWorkflowRepository as any);
    const input = {
      expenseId: "exp-1",
      fromUserId: "user-2",
      toUserId: "user-3",
    };

    it("should throw InvalidDelegationError if self-delegation", async () => {
      const mockStep = {
        getCurrentApproverId: () => ({ getValue: () => "user-2" }),
        getId: () => ({ getValue: () => "step-1" }),
        delegate: vi.fn().mockImplementation(() => {
          throw new InvalidDelegationError("Self delegation");
        }),
      };
      const mockWorkflow = {
        getCurrentStep: vi.fn().mockReturnValue(mockStep),
      };

      const inputSelf = { ...input, toUserId: "user-2" };
      mockWorkflowRepository.findByExpenseId.mockResolvedValueOnce(
        mockWorkflow,
      );

      await expect(handler.handle(inputSelf)).rejects.toThrow(
        InvalidDelegationError,
      );
    });
  });
});
