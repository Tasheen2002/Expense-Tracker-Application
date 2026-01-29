import { describe, it, expect, vi, beforeEach } from "vitest";
import { BudgetPlanController } from "../../../../modules/budget-planning/infrastructure/http/controllers/budget-plan.controller";
import { BudgetPlanService } from "../../../../modules/budget-planning/application/services/budget-plan.service";
import { createMockRequest, createMockReply } from "../mocks/fastify.mock";

// Mock dependencies
const mockCreateHandler = { handle: vi.fn() } as any;
const mockUpdateHandler = { handle: vi.fn() } as any;
const mockActivateHandler = { handle: vi.fn() } as any;
const mockGetHandler = { handle: vi.fn() } as any;
const mockListHandler = { handle: vi.fn() } as any;
const mockBudgetPlanService = {
  getPlan: vi.fn(),
  deletePlan: vi.fn(),
} as unknown as BudgetPlanService;

describe("Authorization Security Tests", () => {
  let controller: BudgetPlanController;

  beforeEach(() => {
    controller = new BudgetPlanController(
      mockCreateHandler,
      mockUpdateHandler,
      mockActivateHandler,
      mockGetHandler,
      mockListHandler,
      mockBudgetPlanService,
    );
    vi.clearAllMocks();
  });

  describe("BudgetPlanController", () => {
    it("should allow request with valid userId", async () => {
      const req = createMockRequest({
        body: {
          workspaceId: "123e4567-e89b-12d3-a456-426614174000",
          name: "Test Budget",
          startDate: "2024-01-01T00:00:00Z",
          endDate: "2024-12-31T23:59:59Z",
          createdBy: "123e4567-e89b-12d3-a456-426614174000",
          description: "Test",
        },
        user: { userId: "123e4567-e89b-12d3-a456-426614174000" },
      });
      const reply = createMockReply();

      mockCreateHandler.handle.mockResolvedValue({
        id: "plan-1",
        name: "Test Budget",
        toPrimitives: () => ({ id: "plan-1" }),
      });

      await controller.create(req as any, reply);

      expect(reply.statusCode).toBe(201);
      expect(mockCreateHandler.handle).toHaveBeenCalled();
    });

    it("should reject request without userId with 401", async () => {
      const req = createMockRequest({
        body: {
          workspaceId: "123e4567-e89b-12d3-a456-426614174000",
          name: "Fail Budget",
          startDate: "2024-01-01T00:00:00Z",
          endDate: "2024-12-31T23:59:59Z",
          createdBy: "123e4567-e89b-12d3-a456-426614174000",
        },
        user: undefined, // Missing user
      });
      const reply = createMockReply();

      await controller.create(req as any, reply);

      expect(reply.statusCode).toBe(401);
      expect(reply.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "User not authenticated",
        }),
      );
      expect(mockCreateHandler.handle).not.toHaveBeenCalled();
    });
  });
});
