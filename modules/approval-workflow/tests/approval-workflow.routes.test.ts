import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { ApprovalChainController } from "../infrastructure/http/controllers/approval-chain.controller";
import { WorkflowController } from "../infrastructure/http/controllers/workflow.controller";
import { approvalChainRoutes } from "../infrastructure/http/routes/approval-chain.routes";
import { workflowRoutes } from "../infrastructure/http/routes/workflow.routes";
import { ApprovalChainService } from "../application/services/approval-chain.service";
import { WorkflowService } from "../application/services/workflow.service";
import { ApprovalChain } from "../domain/entities/approval-chain.entity";
import { ExpenseWorkflow } from "../domain/entities/expense-workflow.entity";
import { ApprovalChainId } from "../domain/value-objects/approval-chain-id";
import { WorkflowId } from "../domain/value-objects/workflow-id";
import { WorkspaceId } from "../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../identity-workspace/domain/value-objects/user-id.vo";
import { ExpenseId } from "../../expense-ledger/domain/value-objects/expense-id";
import {
  ApprovalChainNotFoundError,
  WorkflowNotFoundError,
  WorkflowAlreadyExistsError,
  NoMatchingApprovalChainError,
  UnauthorizedApproverError,
} from "../domain/errors/approval-workflow.errors";

// Mock data
const mockWorkspaceId = "123e4567-e89b-12d3-a456-426614174000";
const mockUserId = "123e4567-e89b-12d3-a456-426614174001";
const mockChainId = "123e4567-e89b-12d3-a456-426614174010";
const mockExpenseId = "123e4567-e89b-12d3-a456-426614174020";
const mockWorkflowId = "123e4567-e89b-12d3-a456-426614174030";
const mockApproverId1 = "123e4567-e89b-12d3-a456-426614174040";
const mockApproverId2 = "123e4567-e89b-12d3-a456-426614174041";

// Helper to create mock ApprovalChain
function createMockApprovalChain(
  id: string = mockChainId,
  name: string = "Default Approval Chain",
  isActive: boolean = true,
): ApprovalChain {
  return ApprovalChain.reconstitute({
    chainId: ApprovalChainId.fromString(id),
    workspaceId: WorkspaceId.fromString(mockWorkspaceId),
    name,
    description: "Test approval chain",
    minAmount: 100,
    maxAmount: 10000,
    categoryIds: undefined,
    requiresReceipt: true,
    approverSequence: [
      UserId.fromString(mockApproverId1),
      UserId.fromString(mockApproverId2),
    ],
    isActive,
    createdAt: new Date("2024-01-15T10:30:00Z"),
    updatedAt: new Date("2024-01-15T10:30:00Z"),
  });
}

// Helper to create mock ExpenseWorkflow
function createMockWorkflow(
  expenseId: string = mockExpenseId,
  status: string = "PENDING",
): ExpenseWorkflow {
  const workflow = ExpenseWorkflow.reconstitute({
    workflowId: WorkflowId.fromString(mockWorkflowId),
    expenseId: ExpenseId.fromString(expenseId),
    workspaceId: WorkspaceId.fromString(mockWorkspaceId),
    userId: UserId.fromString(mockUserId),
    chainId: ApprovalChainId.fromString(mockChainId),
    steps: [],
    status: status as any,
    currentStepNumber: 1,
    createdAt: new Date("2024-01-15T10:30:00Z"),
    updatedAt: new Date("2024-01-15T10:30:00Z"),
  });
  return workflow;
}

// Create mock services
function createMockApprovalChainService() {
  return {
    createChain: vi.fn(),
    updateChain: vi.fn(),
    getChain: vi.fn(),
    listChains: vi.fn(),
    activateChain: vi.fn(),
    deactivateChain: vi.fn(),
    deleteChain: vi.fn(),
  };
}

function createMockWorkflowService() {
  return {
    initiateWorkflow: vi.fn(),
    getWorkflow: vi.fn(),
    approveStep: vi.fn(),
    rejectStep: vi.fn(),
    delegateStep: vi.fn(),
    cancelWorkflow: vi.fn(),
    listPendingApprovals: vi.fn(),
    listUserWorkflows: vi.fn(),
  };
}

// Setup test app with authentication
async function setupTestApp(
  chainService: ApprovalChainService,
  workflowService: WorkflowService,
): Promise<FastifyInstance> {
  const app = Fastify();

  // Mock authentication
  app.decorateRequest("user", null);
  app.addHook("preHandler", async (request) => {
    (request as any).user = {
      userId: mockUserId,
      workspaceId: mockWorkspaceId,
      email: "test@example.com",
      role: "ADMIN",
    };
  });

  const chainController = new ApprovalChainController(chainService);
  const workflowController = new WorkflowController(workflowService);

  await app.register(async (instance) => {
    await approvalChainRoutes(instance, chainController);
  });

  await app.register(async (instance) => {
    await workflowRoutes(instance, workflowController);
  });

  return app;
}

// ============================================================================
// APPROVAL CHAIN ROUTES TESTS
// ============================================================================

describe("Approval Chain Routes", () => {
  let app: FastifyInstance;
  let mockChainService: ReturnType<typeof createMockApprovalChainService>;
  let mockWorkflowService: ReturnType<typeof createMockWorkflowService>;

  beforeEach(async () => {
    mockChainService = createMockApprovalChainService();
    mockWorkflowService = createMockWorkflowService();
    app = await setupTestApp(
      mockChainService as unknown as ApprovalChainService,
      mockWorkflowService as unknown as WorkflowService,
    );
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // POST /:workspaceId/approval-chains - Create Approval Chain
  // ==========================================================================
  describe("POST /:workspaceId/approval-chains", () => {
    const validPayload = {
      name: "High Value Expenses",
      description: "For expenses over $1000",
      minAmount: 1000,
      maxAmount: 50000,
      requiresReceipt: true,
      approverSequence: [mockApproverId1, mockApproverId2],
    };

    it("should create approval chain successfully", async () => {
      const mockChain = createMockApprovalChain();
      mockChainService.createChain.mockResolvedValue(mockChain);

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/approval-chains`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe("Approval chain created successfully");
      expect(body.data).toBeDefined();
      expect(mockChainService.createChain).toHaveBeenCalledWith({
        workspaceId: mockWorkspaceId,
        ...validPayload,
      });
    });

    it("should return 400 for missing required fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/approval-chains`,
        payload: { name: "Test" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for empty approver sequence", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/approval-chains`,
        payload: { ...validPayload, approverSequence: [] },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid workspaceId format", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/invalid-uuid/approval-chains`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid approver UUID", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/approval-chains`,
        payload: { ...validPayload, approverSequence: ["not-a-uuid"] },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for negative minAmount", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/approval-chains`,
        payload: { ...validPayload, minAmount: -100 },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for name exceeding max length", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/approval-chains`,
        payload: { ...validPayload, name: "A".repeat(101) },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should handle service errors gracefully", async () => {
      mockChainService.createChain.mockRejectedValue(new Error("DB Error"));

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/approval-chains`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(500);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/approval-chains - List Approval Chains
  // ==========================================================================
  describe("GET /:workspaceId/approval-chains", () => {
    it("should list all approval chains", async () => {
      const mockChains = [
        createMockApprovalChain(mockChainId, "Chain 1", true),
        createMockApprovalChain(
          "123e4567-e89b-12d3-a456-426614174011",
          "Chain 2",
          false,
        ),
      ];
      mockChainService.listChains.mockResolvedValue(mockChains);

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/approval-chains`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(mockChainService.listChains).toHaveBeenCalledWith(
        mockWorkspaceId,
        false,
      );
    });

    it("should filter by active chains only", async () => {
      const mockChains = [
        createMockApprovalChain(mockChainId, "Chain 1", true),
      ];
      mockChainService.listChains.mockResolvedValue(mockChains);

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/approval-chains?activeOnly=true`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(mockChainService.listChains).toHaveBeenCalledWith(
        mockWorkspaceId,
        true,
      );
    });

    it("should return empty array when no chains exist", async () => {
      mockChainService.listChains.mockResolvedValue([]);

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/approval-chains`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(0);
    });

    it("should return 400 for invalid workspaceId", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/invalid-uuid/approval-chains`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/approval-chains/:chainId - Get Approval Chain
  // ==========================================================================
  describe("GET /:workspaceId/approval-chains/:chainId", () => {
    it("should get approval chain by ID", async () => {
      const mockChain = createMockApprovalChain();
      mockChainService.getChain.mockResolvedValue(mockChain);

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/approval-chains/${mockChainId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(mockChainService.getChain).toHaveBeenCalledWith(
        mockChainId,
        mockWorkspaceId,
      );
    });

    it("should return 404 for non-existent chain", async () => {
      mockChainService.getChain.mockRejectedValue(
        new ApprovalChainNotFoundError(mockChainId),
      );

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/approval-chains/${mockChainId}`,
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 for invalid chainId format", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/approval-chains/invalid-uuid`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // PATCH /:workspaceId/approval-chains/:chainId - Update Approval Chain
  // ==========================================================================
  describe("PATCH /:workspaceId/approval-chains/:chainId", () => {
    it("should update approval chain name", async () => {
      const mockChain = createMockApprovalChain();
      mockChainService.updateChain.mockResolvedValue(mockChain);

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/approval-chains/${mockChainId}`,
        payload: { name: "Updated Chain Name" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe("Approval chain updated successfully");
    });

    it("should update approval chain amount range", async () => {
      const mockChain = createMockApprovalChain();
      mockChainService.updateChain.mockResolvedValue(mockChain);

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/approval-chains/${mockChainId}`,
        payload: { minAmount: 500, maxAmount: 25000 },
      });

      expect(response.statusCode).toBe(200);
      expect(mockChainService.updateChain).toHaveBeenCalledWith({
        chainId: mockChainId,
        workspaceId: mockWorkspaceId,
        minAmount: 500,
        maxAmount: 25000,
      });
    });

    it("should update approver sequence", async () => {
      const mockChain = createMockApprovalChain();
      mockChainService.updateChain.mockResolvedValue(mockChain);
      const newSequence = [mockApproverId2, mockApproverId1];

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/approval-chains/${mockChainId}`,
        payload: { approverSequence: newSequence },
      });

      expect(response.statusCode).toBe(200);
    });

    it("should return 404 for non-existent chain", async () => {
      mockChainService.updateChain.mockRejectedValue(
        new ApprovalChainNotFoundError(mockChainId),
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/approval-chains/${mockChainId}`,
        payload: { name: "Updated" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 for empty name", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/approval-chains/${mockChainId}`,
        payload: { name: "" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // POST /:workspaceId/approval-chains/:chainId/activate - Activate Chain
  // ==========================================================================
  describe("POST /:workspaceId/approval-chains/:chainId/activate", () => {
    it("should activate approval chain", async () => {
      const mockChain = createMockApprovalChain(mockChainId, "Chain", true);
      mockChainService.activateChain.mockResolvedValue(mockChain);

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/approval-chains/${mockChainId}/activate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe("Approval chain activated successfully");
    });

    it("should return 404 for non-existent chain", async () => {
      mockChainService.activateChain.mockRejectedValue(
        new ApprovalChainNotFoundError(mockChainId),
      );

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/approval-chains/${mockChainId}/activate`,
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 for invalid chainId", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/approval-chains/invalid-uuid/activate`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // POST /:workspaceId/approval-chains/:chainId/deactivate - Deactivate Chain
  // ==========================================================================
  describe("POST /:workspaceId/approval-chains/:chainId/deactivate", () => {
    it("should deactivate approval chain", async () => {
      const mockChain = createMockApprovalChain(mockChainId, "Chain", false);
      mockChainService.deactivateChain.mockResolvedValue(mockChain);

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/approval-chains/${mockChainId}/deactivate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe("Approval chain deactivated successfully");
    });

    it("should return 404 for non-existent chain", async () => {
      mockChainService.deactivateChain.mockRejectedValue(
        new ApprovalChainNotFoundError(mockChainId),
      );

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/approval-chains/${mockChainId}/deactivate`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // DELETE /:workspaceId/approval-chains/:chainId - Delete Approval Chain
  // ==========================================================================
  describe("DELETE /:workspaceId/approval-chains/:chainId", () => {
    it("should delete approval chain", async () => {
      mockChainService.deleteChain.mockResolvedValue(undefined);

      const response = await app.inject({
        method: "DELETE",
        url: `/${mockWorkspaceId}/approval-chains/${mockChainId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it("should return 404 for non-existent chain", async () => {
      mockChainService.deleteChain.mockRejectedValue(
        new ApprovalChainNotFoundError(mockChainId),
      );

      const response = await app.inject({
        method: "DELETE",
        url: `/${mockWorkspaceId}/approval-chains/${mockChainId}`,
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 for invalid chainId format", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/${mockWorkspaceId}/approval-chains/not-a-uuid`,
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

// ============================================================================
// WORKFLOW ROUTES TESTS
// ============================================================================

describe("Workflow Routes", () => {
  let app: FastifyInstance;
  let mockChainService: ReturnType<typeof createMockApprovalChainService>;
  let mockWorkflowService: ReturnType<typeof createMockWorkflowService>;

  beforeEach(async () => {
    mockChainService = createMockApprovalChainService();
    mockWorkflowService = createMockWorkflowService();
    app = await setupTestApp(
      mockChainService as unknown as ApprovalChainService,
      mockWorkflowService as unknown as WorkflowService,
    );
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // POST /:workspaceId/workflows - Initiate Workflow
  // ==========================================================================
  describe("POST /:workspaceId/workflows", () => {
    const validPayload = {
      expenseId: mockExpenseId,
      amount: 500,
      categoryId: "123e4567-e89b-12d3-a456-426614174050",
      hasReceipt: true,
    };

    it("should initiate workflow successfully", async () => {
      const mockWorkflow = createMockWorkflow();
      mockWorkflowService.initiateWorkflow.mockResolvedValue(mockWorkflow);

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe("Workflow initiated successfully");
      expect(mockWorkflowService.initiateWorkflow).toHaveBeenCalledWith({
        ...validPayload,
        userId: mockUserId,
        workspaceId: mockWorkspaceId,
      });
    });

    it("should return 400 for missing expenseId", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows`,
        payload: { amount: 500, hasReceipt: true },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for missing amount", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows`,
        payload: { expenseId: mockExpenseId, hasReceipt: true },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for zero amount", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows`,
        payload: { ...validPayload, amount: 0 },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid expenseId format", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows`,
        payload: { ...validPayload, expenseId: "invalid-uuid" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 409 for existing workflow", async () => {
      mockWorkflowService.initiateWorkflow.mockRejectedValue(
        new WorkflowAlreadyExistsError(mockExpenseId),
      );

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(409);
    });

    it("should return 400 for no matching approval chain", async () => {
      mockWorkflowService.initiateWorkflow.mockRejectedValue(
        new NoMatchingApprovalChainError(mockWorkspaceId, 500),
      );

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/workflows/:expenseId - Get Workflow
  // ==========================================================================
  describe("GET /:workspaceId/workflows/:expenseId", () => {
    it("should get workflow by expense ID", async () => {
      const mockWorkflow = createMockWorkflow();
      mockWorkflowService.getWorkflow.mockResolvedValue(mockWorkflow);

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/workflows/${mockExpenseId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("should return 404 for non-existent workflow", async () => {
      mockWorkflowService.getWorkflow.mockRejectedValue(
        new WorkflowNotFoundError(mockExpenseId),
      );

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/workflows/${mockExpenseId}`,
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 for invalid expenseId format", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/workflows/not-a-uuid`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // POST /:workspaceId/workflows/:expenseId/approve - Approve Step
  // ==========================================================================
  describe("POST /:workspaceId/workflows/:expenseId/approve", () => {
    it("should approve step successfully", async () => {
      const mockWorkflow = createMockWorkflow();
      mockWorkflowService.approveStep.mockResolvedValue(mockWorkflow);

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows/${mockExpenseId}/approve`,
        payload: { comments: "Looks good" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe("Step approved successfully");
      expect(mockWorkflowService.approveStep).toHaveBeenCalledWith({
        expenseId: mockExpenseId,
        approverId: mockUserId,
        comments: "Looks good",
      });
    });

    it("should approve step without comments", async () => {
      const mockWorkflow = createMockWorkflow();
      mockWorkflowService.approveStep.mockResolvedValue(mockWorkflow);

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows/${mockExpenseId}/approve`,
        payload: {},
      });

      expect(response.statusCode).toBe(200);
    });

    it("should return 403 for unauthorized approver", async () => {
      mockWorkflowService.approveStep.mockRejectedValue(
        new UnauthorizedApproverError(mockUserId, "step-123"),
      );

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows/${mockExpenseId}/approve`,
        payload: {},
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 404 for non-existent workflow", async () => {
      mockWorkflowService.approveStep.mockRejectedValue(
        new WorkflowNotFoundError(mockExpenseId),
      );

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows/${mockExpenseId}/approve`,
        payload: {},
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // POST /:workspaceId/workflows/:expenseId/reject - Reject Step
  // ==========================================================================
  describe("POST /:workspaceId/workflows/:expenseId/reject", () => {
    it("should reject step successfully", async () => {
      const mockWorkflow = createMockWorkflow();
      mockWorkflowService.rejectStep.mockResolvedValue(mockWorkflow);

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows/${mockExpenseId}/reject`,
        payload: { comments: "Missing documentation" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe("Step rejected successfully");
    });

    it("should return 400 for missing comments", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows/${mockExpenseId}/reject`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for empty comments", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows/${mockExpenseId}/reject`,
        payload: { comments: "" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 403 for unauthorized approver", async () => {
      mockWorkflowService.rejectStep.mockRejectedValue(
        new UnauthorizedApproverError(mockUserId, "step-123"),
      );

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows/${mockExpenseId}/reject`,
        payload: { comments: "Rejected" },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // POST /:workspaceId/workflows/:expenseId/delegate - Delegate Step
  // ==========================================================================
  describe("POST /:workspaceId/workflows/:expenseId/delegate", () => {
    it("should delegate step successfully", async () => {
      const mockWorkflow = createMockWorkflow();
      mockWorkflowService.delegateStep.mockResolvedValue(mockWorkflow);

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows/${mockExpenseId}/delegate`,
        payload: { toUserId: mockApproverId2 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it("should return 400 for missing toUserId", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows/${mockExpenseId}/delegate`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid toUserId format", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows/${mockExpenseId}/delegate`,
        payload: { toUserId: "invalid-uuid" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 403 for unauthorized user", async () => {
      mockWorkflowService.delegateStep.mockRejectedValue(
        new UnauthorizedApproverError(mockUserId, "step-123"),
      );

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows/${mockExpenseId}/delegate`,
        payload: { toUserId: mockApproverId2 },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // POST /:workspaceId/workflows/:expenseId/cancel - Cancel Workflow
  // ==========================================================================
  describe("POST /:workspaceId/workflows/:expenseId/cancel", () => {
    it("should cancel workflow successfully", async () => {
      const mockWorkflow = createMockWorkflow(mockExpenseId, "CANCELLED");
      mockWorkflowService.cancelWorkflow.mockResolvedValue(mockWorkflow);

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows/${mockExpenseId}/cancel`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it("should return 404 for non-existent workflow", async () => {
      mockWorkflowService.cancelWorkflow.mockRejectedValue(
        new WorkflowNotFoundError(mockExpenseId),
      );

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows/${mockExpenseId}/cancel`,
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 for invalid expenseId format", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/workflows/not-a-uuid/cancel`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/workflows/pending-approvals - List Pending Approvals
  // ==========================================================================
  describe("GET /:workspaceId/workflows/pending-approvals", () => {
    it("should list pending approvals", async () => {
      const mockWorkflows = [createMockWorkflow(), createMockWorkflow()];
      mockWorkflowService.listPendingApprovals.mockResolvedValue({
        items: mockWorkflows,
        total: 2,
        limit: 50,
        offset: 0,
        hasMore: false,
      });

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/workflows/pending-approvals`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("should return empty array when no pending approvals", async () => {
      mockWorkflowService.listPendingApprovals.mockResolvedValue({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
      });

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/workflows/pending-approvals`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.items).toHaveLength(0);
    });

    it("should return 400 for invalid workspaceId", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/invalid-uuid/workflows/pending-approvals`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/workflows/user-workflows - List User Workflows
  // ==========================================================================
  describe("GET /:workspaceId/workflows/user-workflows", () => {
    it("should list user workflows", async () => {
      const mockWorkflows = [createMockWorkflow()];
      mockWorkflowService.listUserWorkflows.mockResolvedValue({
        items: mockWorkflows,
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false,
      });

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/workflows/user-workflows`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("should return empty array when user has no workflows", async () => {
      mockWorkflowService.listUserWorkflows.mockResolvedValue({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
      });

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/workflows/user-workflows`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.items).toHaveLength(0);
    });

    it("should return 400 for invalid workspaceId", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/bad-uuid/workflows/user-workflows`,
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

// ============================================================================
// SECURITY TESTS
// ============================================================================

describe("Approval Workflow Security", () => {
  let app: FastifyInstance;
  let mockChainService: ReturnType<typeof createMockApprovalChainService>;
  let mockWorkflowService: ReturnType<typeof createMockWorkflowService>;

  beforeEach(async () => {
    mockChainService = createMockApprovalChainService();
    mockWorkflowService = createMockWorkflowService();
    app = await setupTestApp(
      mockChainService as unknown as ApprovalChainService,
      mockWorkflowService as unknown as WorkflowService,
    );
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it("should use authenticated user for workflow initiation", async () => {
    const mockWorkflow = createMockWorkflow();
    mockWorkflowService.initiateWorkflow.mockResolvedValue(mockWorkflow);

    await app.inject({
      method: "POST",
      url: `/${mockWorkspaceId}/workflows`,
      payload: {
        expenseId: mockExpenseId,
        amount: 500,
        hasReceipt: true,
      },
    });

    expect(mockWorkflowService.initiateWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUserId, // Should use authenticated user, not from body
      }),
    );
  });

  it("should use authenticated user for approval", async () => {
    const mockWorkflow = createMockWorkflow();
    mockWorkflowService.approveStep.mockResolvedValue(mockWorkflow);

    await app.inject({
      method: "POST",
      url: `/${mockWorkspaceId}/workflows/${mockExpenseId}/approve`,
      payload: {},
    });

    expect(mockWorkflowService.approveStep).toHaveBeenCalledWith(
      expect.objectContaining({
        approverId: mockUserId, // Should use authenticated user
      }),
    );
  });

  it("should use authenticated user for rejection", async () => {
    const mockWorkflow = createMockWorkflow();
    mockWorkflowService.rejectStep.mockResolvedValue(mockWorkflow);

    await app.inject({
      method: "POST",
      url: `/${mockWorkspaceId}/workflows/${mockExpenseId}/reject`,
      payload: { comments: "Rejected" },
    });

    expect(mockWorkflowService.rejectStep).toHaveBeenCalledWith(
      expect.objectContaining({
        approverId: mockUserId, // Should use authenticated user
      }),
    );
  });

  it("should use authenticated user for delegation", async () => {
    const mockWorkflow = createMockWorkflow();
    mockWorkflowService.delegateStep.mockResolvedValue(mockWorkflow);

    await app.inject({
      method: "POST",
      url: `/${mockWorkspaceId}/workflows/${mockExpenseId}/delegate`,
      payload: { toUserId: mockApproverId2 },
    });

    expect(mockWorkflowService.delegateStep).toHaveBeenCalledWith(
      expect.objectContaining({
        fromUserId: mockUserId, // Should use authenticated user
      }),
    );
  });
});

// ============================================================================
// EDGE CASES & INTEGRATION TESTS
// ============================================================================

describe("Approval Workflow Edge Cases", () => {
  let app: FastifyInstance;
  let mockChainService: ReturnType<typeof createMockApprovalChainService>;
  let mockWorkflowService: ReturnType<typeof createMockWorkflowService>;

  beforeEach(async () => {
    mockChainService = createMockApprovalChainService();
    mockWorkflowService = createMockWorkflowService();
    app = await setupTestApp(
      mockChainService as unknown as ApprovalChainService,
      mockWorkflowService as unknown as WorkflowService,
    );
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it("should handle very large amount values", async () => {
    const mockWorkflow = createMockWorkflow();
    mockWorkflowService.initiateWorkflow.mockResolvedValue(mockWorkflow);

    const response = await app.inject({
      method: "POST",
      url: `/${mockWorkspaceId}/workflows`,
      payload: {
        expenseId: mockExpenseId,
        amount: 999999999.99,
        hasReceipt: true,
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it("should handle decimal amount values", async () => {
    const mockWorkflow = createMockWorkflow();
    mockWorkflowService.initiateWorkflow.mockResolvedValue(mockWorkflow);

    const response = await app.inject({
      method: "POST",
      url: `/${mockWorkspaceId}/workflows`,
      payload: {
        expenseId: mockExpenseId,
        amount: 123.45,
        hasReceipt: true,
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it("should handle unicode characters in chain name", async () => {
    const mockChain = createMockApprovalChain();
    mockChainService.createChain.mockResolvedValue(mockChain);

    const response = await app.inject({
      method: "POST",
      url: `/${mockWorkspaceId}/approval-chains`,
      payload: {
        name: "审批链 Approval チェーン",
        requiresReceipt: true,
        approverSequence: [mockApproverId1],
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it("should handle special characters in comments", async () => {
    const mockWorkflow = createMockWorkflow();
    mockWorkflowService.rejectStep.mockResolvedValue(mockWorkflow);

    const response = await app.inject({
      method: "POST",
      url: `/${mockWorkspaceId}/workflows/${mockExpenseId}/reject`,
      payload: { comments: "Rejected: <script>alert('xss')</script> & more" },
    });

    expect(response.statusCode).toBe(200);
  });

  it("should handle concurrent requests gracefully", async () => {
    const mockChains = [createMockApprovalChain()];
    mockChainService.listChains.mockResolvedValue(mockChains);

    const requests = Array(5)
      .fill(null)
      .map(() =>
        app.inject({
          method: "GET",
          url: `/${mockWorkspaceId}/approval-chains`,
        }),
      );

    const responses = await Promise.all(requests);
    responses.forEach((response) => {
      expect(response.statusCode).toBe(200);
    });
  });

  it("should handle minimum amount value (0.01)", async () => {
    const mockWorkflow = createMockWorkflow();
    mockWorkflowService.initiateWorkflow.mockResolvedValue(mockWorkflow);

    const response = await app.inject({
      method: "POST",
      url: `/${mockWorkspaceId}/workflows`,
      payload: {
        expenseId: mockExpenseId,
        amount: 0.01,
        hasReceipt: false,
      },
    });

    expect(response.statusCode).toBe(201);
  });
});
