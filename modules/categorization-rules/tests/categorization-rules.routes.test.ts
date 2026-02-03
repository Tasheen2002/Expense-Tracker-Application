import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { CategoryRuleController } from "../infrastructure/http/controllers/category-rule.controller";
import { CategorySuggestionController } from "../infrastructure/http/controllers/category-suggestion.controller";
import { RuleExecutionController } from "../infrastructure/http/controllers/rule-execution.controller";
import { categoryRuleRoutes } from "../infrastructure/http/routes/category-rule.routes";
import { categorySuggestionRoutes } from "../infrastructure/http/routes/category-suggestion.routes";
import { ruleExecutionRoutes } from "../infrastructure/http/routes/rule-execution.routes";

// Create domain errors with statusCode for testing
class CategoryRuleNotFoundError extends Error {
  statusCode = 404;
  constructor(ruleId: string) {
    super(`Category rule with ID ${ruleId} not found`);
    this.name = "CategoryRuleNotFoundError";
  }
}

class DuplicateRuleNameError extends Error {
  statusCode = 409;
  constructor(name: string) {
    super(`A rule with name "${name}" already exists in this workspace`);
    this.name = "DuplicateRuleNameError";
  }
}

class CategorySuggestionNotFoundError extends Error {
  statusCode = 404;
  constructor(suggestionId: string) {
    super(`Category suggestion with ID ${suggestionId} not found`);
    this.name = "CategorySuggestionNotFoundError";
  }
}

class SuggestionAlreadyRespondedError extends Error {
  statusCode = 409;
  constructor(suggestionId: string) {
    super(`Suggestion ${suggestionId} has already been accepted or rejected`);
    this.name = "SuggestionAlreadyRespondedError";
  }
}

class UnauthorizedRuleAccessError extends Error {
  statusCode = 403;
  constructor(action: string) {
    super(`You are not authorized to ${action} this rule`);
    this.name = "UnauthorizedRuleAccessError";
  }
}

// Mock data
const mockWorkspaceId = "123e4567-e89b-12d3-a456-426614174000";
const mockUserId = "123e4567-e89b-12d3-a456-426614174001";
const mockRuleId = "123e4567-e89b-12d3-a456-426614174010";
const mockSuggestionId = "123e4567-e89b-12d3-a456-426614174020";
const mockExpenseId = "123e4567-e89b-12d3-a456-426614174030";
const mockCategoryId = "123e4567-e89b-12d3-a456-426614174040";
const mockExecutionId = "123e4567-e89b-12d3-a456-426614174050";

// Helper to create mock CategoryRule response
function createMockRule(
  id: string = mockRuleId,
  name: string = "Test Rule",
  isActive: boolean = true,
) {
  return {
    id,
    workspaceId: mockWorkspaceId,
    name,
    description: "Test description",
    priority: 10,
    isActive,
    conditionType: "MERCHANT_CONTAINS",
    conditionValue: "Amazon",
    targetCategoryId: mockCategoryId,
    createdBy: mockUserId,
    createdAt: new Date("2024-01-15T10:30:00Z"),
    updatedAt: new Date("2024-01-15T10:30:00Z"),
  };
}

// Helper to create mock CategorySuggestion response
function createMockSuggestion(
  id: string = mockSuggestionId,
  isAccepted: boolean | null = null,
) {
  return {
    id,
    workspaceId: mockWorkspaceId,
    expenseId: mockExpenseId,
    suggestedCategoryId: mockCategoryId,
    confidence: 0.85,
    reason: "Merchant match",
    isAccepted,
    createdAt: new Date("2024-01-15T10:30:00Z"),
    respondedAt: isAccepted !== null ? new Date("2024-01-15T11:00:00Z") : null,
  };
}

// Helper to create mock RuleExecution response
function createMockExecution(id: string = mockExecutionId) {
  return {
    id,
    workspaceId: mockWorkspaceId,
    ruleId: mockRuleId,
    expenseId: mockExpenseId,
    matched: true,
    appliedCategoryId: mockCategoryId,
    executedAt: new Date("2024-01-15T10:30:00Z"),
  };
}

// Create mock handlers
function createMockRuleHandlers() {
  return {
    createRuleHandler: { execute: vi.fn() },
    updateRuleHandler: { execute: vi.fn() },
    deleteRuleHandler: { execute: vi.fn() },
    activateRuleHandler: { execute: vi.fn() },
    deactivateRuleHandler: { execute: vi.fn() },
    getRuleByIdHandler: { execute: vi.fn() },
    getRulesByWorkspaceHandler: { execute: vi.fn() },
    getActiveRulesByWorkspaceHandler: { execute: vi.fn() },
    getExecutionsByRuleHandler: { execute: vi.fn() },
  };
}

function createMockSuggestionHandlers() {
  return {
    createSuggestionHandler: { execute: vi.fn() },
    acceptSuggestionHandler: { execute: vi.fn() },
    rejectSuggestionHandler: { execute: vi.fn() },
    deleteSuggestionHandler: { execute: vi.fn() },
    getSuggestionByIdHandler: { execute: vi.fn() },
    getSuggestionsByExpenseHandler: { execute: vi.fn() },
    getPendingSuggestionsByWorkspaceHandler: { execute: vi.fn() },
    getSuggestionsByWorkspaceHandler: { execute: vi.fn() },
  };
}

function createMockExecutionHandlers() {
  return {
    evaluateRulesHandler: { execute: vi.fn() },
    getExecutionsByExpenseHandler: { execute: vi.fn() },
    getExecutionsByWorkspaceHandler: { execute: vi.fn() },
  };
}

// Setup test app with authentication
async function setupTestApp(
  ruleHandlers: ReturnType<typeof createMockRuleHandlers>,
  suggestionHandlers: ReturnType<typeof createMockSuggestionHandlers>,
  executionHandlers: ReturnType<typeof createMockExecutionHandlers>,
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

  const ruleController = new CategoryRuleController(
    ruleHandlers.createRuleHandler as any,
    ruleHandlers.updateRuleHandler as any,
    ruleHandlers.deleteRuleHandler as any,
    ruleHandlers.activateRuleHandler as any,
    ruleHandlers.deactivateRuleHandler as any,
    ruleHandlers.getRuleByIdHandler as any,
    ruleHandlers.getRulesByWorkspaceHandler as any,
    ruleHandlers.getActiveRulesByWorkspaceHandler as any,
    ruleHandlers.getExecutionsByRuleHandler as any,
  );

  const suggestionController = new CategorySuggestionController(
    suggestionHandlers.createSuggestionHandler as any,
    suggestionHandlers.acceptSuggestionHandler as any,
    suggestionHandlers.rejectSuggestionHandler as any,
    suggestionHandlers.deleteSuggestionHandler as any,
    suggestionHandlers.getSuggestionByIdHandler as any,
    suggestionHandlers.getSuggestionsByExpenseHandler as any,
    suggestionHandlers.getPendingSuggestionsByWorkspaceHandler as any,
    suggestionHandlers.getSuggestionsByWorkspaceHandler as any,
  );

  const executionController = new RuleExecutionController(
    executionHandlers.evaluateRulesHandler as any,
    executionHandlers.getExecutionsByExpenseHandler as any,
    executionHandlers.getExecutionsByWorkspaceHandler as any,
  );

  await app.register(async (instance) => {
    await categoryRuleRoutes(instance, ruleController);
  });

  await app.register(async (instance) => {
    await categorySuggestionRoutes(instance, suggestionController);
  });

  await app.register(async (instance) => {
    await ruleExecutionRoutes(instance, executionController);
  });

  return app;
}

// ============================================================================
// CATEGORY RULE ROUTES TESTS
// ============================================================================

describe("Category Rule Routes", () => {
  let app: FastifyInstance;
  let ruleHandlers: ReturnType<typeof createMockRuleHandlers>;
  let suggestionHandlers: ReturnType<typeof createMockSuggestionHandlers>;
  let executionHandlers: ReturnType<typeof createMockExecutionHandlers>;

  beforeEach(async () => {
    ruleHandlers = createMockRuleHandlers();
    suggestionHandlers = createMockSuggestionHandlers();
    executionHandlers = createMockExecutionHandlers();
    app = await setupTestApp(
      ruleHandlers,
      suggestionHandlers,
      executionHandlers,
    );
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // POST /:workspaceId/rules - Create Category Rule
  // ==========================================================================
  describe("POST /:workspaceId/rules", () => {
    const validPayload = {
      name: "Amazon Shopping Rule",
      description: "Categorize Amazon purchases",
      priority: 10,
      conditionType: "MERCHANT_CONTAINS",
      conditionValue: "Amazon",
      targetCategoryId: mockCategoryId,
    };

    it("should create category rule successfully", async () => {
      const mockRule = createMockRule();
      ruleHandlers.createRuleHandler.execute.mockResolvedValue(mockRule);

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/rules`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe("Category rule created successfully");
      expect(body.data).toBeDefined();
    });

    it("should return 400 for missing required fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/rules`,
        payload: { name: "Test" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid conditionType", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/rules`,
        payload: { ...validPayload, conditionType: "INVALID_TYPE" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid workspaceId format", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/invalid-uuid/rules`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid targetCategoryId format", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/rules`,
        payload: { ...validPayload, targetCategoryId: "not-a-uuid" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for empty name", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/rules`,
        payload: { ...validPayload, name: "" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for name exceeding max length", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/rules`,
        payload: { ...validPayload, name: "A".repeat(101) },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for negative priority", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/rules`,
        payload: { ...validPayload, priority: -1 },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 409 for duplicate rule name", async () => {
      ruleHandlers.createRuleHandler.execute.mockRejectedValue(
        new DuplicateRuleNameError("Amazon Shopping Rule"),
      );

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/rules`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(409);
    });

    it("should handle service errors gracefully", async () => {
      ruleHandlers.createRuleHandler.execute.mockRejectedValue(
        new Error("DB Error"),
      );

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/rules`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(500);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/rules - List Category Rules
  // ==========================================================================
  describe("GET /:workspaceId/rules", () => {
    it("should list all category rules", async () => {
      const mockRules = [
        createMockRule(mockRuleId, "Rule 1"),
        createMockRule("123e4567-e89b-12d3-a456-426614174011", "Rule 2"),
      ];
      ruleHandlers.getRulesByWorkspaceHandler.execute.mockResolvedValue(
        mockRules,
      );

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/rules`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
    });

    it("should filter by active rules only", async () => {
      const mockRules = [createMockRule(mockRuleId, "Active Rule", true)];
      ruleHandlers.getActiveRulesByWorkspaceHandler.execute.mockResolvedValue(
        mockRules,
      );

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/rules?activeOnly=true`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
    });

    it("should return empty array when no rules exist", async () => {
      ruleHandlers.getRulesByWorkspaceHandler.execute.mockResolvedValue([]);

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/rules`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(0);
    });

    it("should return 400 for invalid workspaceId", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/invalid-uuid/rules`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/rules/:ruleId - Get Category Rule
  // ==========================================================================
  describe("GET /:workspaceId/rules/:ruleId", () => {
    it("should get category rule by ID", async () => {
      const mockRule = createMockRule();
      ruleHandlers.getRuleByIdHandler.execute.mockResolvedValue(mockRule);

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/rules/${mockRuleId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("should return 404 for non-existent rule", async () => {
      ruleHandlers.getRuleByIdHandler.execute.mockRejectedValue(
        new CategoryRuleNotFoundError(mockRuleId),
      );

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/rules/${mockRuleId}`,
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 for invalid ruleId format", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/rules/invalid-uuid`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // PATCH /:workspaceId/rules/:ruleId - Update Category Rule
  // ==========================================================================
  describe("PATCH /:workspaceId/rules/:ruleId", () => {
    it("should update category rule name", async () => {
      const mockRule = createMockRule();
      ruleHandlers.updateRuleHandler.execute.mockResolvedValue(mockRule);

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/rules/${mockRuleId}`,
        payload: { name: "Updated Rule Name" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it("should update category rule priority", async () => {
      const mockRule = createMockRule();
      ruleHandlers.updateRuleHandler.execute.mockResolvedValue(mockRule);

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/rules/${mockRuleId}`,
        payload: { priority: 20 },
      });

      expect(response.statusCode).toBe(200);
    });

    it("should update category rule condition", async () => {
      const mockRule = createMockRule();
      ruleHandlers.updateRuleHandler.execute.mockResolvedValue(mockRule);

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/rules/${mockRuleId}`,
        payload: {
          conditionType: "AMOUNT_GREATER_THAN",
          conditionValue: "100",
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it("should return 404 for non-existent rule", async () => {
      ruleHandlers.updateRuleHandler.execute.mockRejectedValue(
        new CategoryRuleNotFoundError(mockRuleId),
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/rules/${mockRuleId}`,
        payload: { name: "Updated" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 for empty name", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/rules/${mockRuleId}`,
        payload: { name: "" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 403 for unauthorized access", async () => {
      ruleHandlers.updateRuleHandler.execute.mockRejectedValue(
        new UnauthorizedRuleAccessError("update"),
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/rules/${mockRuleId}`,
        payload: { name: "Updated" },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // DELETE /:workspaceId/rules/:ruleId - Delete Category Rule
  // ==========================================================================
  describe("DELETE /:workspaceId/rules/:ruleId", () => {
    it("should delete category rule", async () => {
      ruleHandlers.deleteRuleHandler.execute.mockResolvedValue(undefined);

      const response = await app.inject({
        method: "DELETE",
        url: `/${mockWorkspaceId}/rules/${mockRuleId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it("should return 404 for non-existent rule", async () => {
      ruleHandlers.deleteRuleHandler.execute.mockRejectedValue(
        new CategoryRuleNotFoundError(mockRuleId),
      );

      const response = await app.inject({
        method: "DELETE",
        url: `/${mockWorkspaceId}/rules/${mockRuleId}`,
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 for invalid ruleId format", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/${mockWorkspaceId}/rules/not-a-uuid`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // PATCH /:workspaceId/rules/:ruleId/activate - Activate Rule
  // ==========================================================================
  describe("PATCH /:workspaceId/rules/:ruleId/activate", () => {
    it("should activate category rule", async () => {
      const mockRule = createMockRule(mockRuleId, "Test", true);
      ruleHandlers.activateRuleHandler.execute.mockResolvedValue(mockRule);

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/rules/${mockRuleId}/activate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it("should return 404 for non-existent rule", async () => {
      ruleHandlers.activateRuleHandler.execute.mockRejectedValue(
        new CategoryRuleNotFoundError(mockRuleId),
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/rules/${mockRuleId}/activate`,
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 for invalid ruleId", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/rules/invalid-uuid/activate`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // PATCH /:workspaceId/rules/:ruleId/deactivate - Deactivate Rule
  // ==========================================================================
  describe("PATCH /:workspaceId/rules/:ruleId/deactivate", () => {
    it("should deactivate category rule", async () => {
      const mockRule = createMockRule(mockRuleId, "Test", false);
      ruleHandlers.deactivateRuleHandler.execute.mockResolvedValue(mockRule);

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/rules/${mockRuleId}/deactivate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it("should return 404 for non-existent rule", async () => {
      ruleHandlers.deactivateRuleHandler.execute.mockRejectedValue(
        new CategoryRuleNotFoundError(mockRuleId),
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/rules/${mockRuleId}/deactivate`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/rules/:ruleId/executions - Get Rule Executions
  // ==========================================================================
  describe("GET /:workspaceId/rules/:ruleId/executions", () => {
    it("should get rule executions", async () => {
      const mockExecutions = [createMockExecution()];
      ruleHandlers.getExecutionsByRuleHandler.execute.mockResolvedValue(
        mockExecutions,
      );

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/rules/${mockRuleId}/executions`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("should return empty array when no executions", async () => {
      ruleHandlers.getExecutionsByRuleHandler.execute.mockResolvedValue([]);

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/rules/${mockRuleId}/executions`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(0);
    });
  });
});

// ============================================================================
// CATEGORY SUGGESTION ROUTES TESTS
// ============================================================================

describe("Category Suggestion Routes", () => {
  let app: FastifyInstance;
  let ruleHandlers: ReturnType<typeof createMockRuleHandlers>;
  let suggestionHandlers: ReturnType<typeof createMockSuggestionHandlers>;
  let executionHandlers: ReturnType<typeof createMockExecutionHandlers>;

  beforeEach(async () => {
    ruleHandlers = createMockRuleHandlers();
    suggestionHandlers = createMockSuggestionHandlers();
    executionHandlers = createMockExecutionHandlers();
    app = await setupTestApp(
      ruleHandlers,
      suggestionHandlers,
      executionHandlers,
    );
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // POST /:workspaceId/suggestions - Create Suggestion
  // ==========================================================================
  describe("POST /:workspaceId/suggestions", () => {
    const validPayload = {
      expenseId: mockExpenseId,
      suggestedCategoryId: mockCategoryId,
      confidence: 0.85,
      reason: "Merchant pattern match",
    };

    it("should create suggestion successfully", async () => {
      const mockSuggestion = createMockSuggestion();
      suggestionHandlers.createSuggestionHandler.execute.mockResolvedValue(
        mockSuggestion,
      );

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/suggestions`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it("should return 400 for missing required fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/suggestions`,
        payload: { expenseId: mockExpenseId },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid confidence (> 1)", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/suggestions`,
        payload: { ...validPayload, confidence: 1.5 },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid confidence (< 0)", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/suggestions`,
        payload: { ...validPayload, confidence: -0.1 },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid expenseId format", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/suggestions`,
        payload: { ...validPayload, expenseId: "not-a-uuid" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/suggestions - List Suggestions
  // ==========================================================================
  describe("GET /:workspaceId/suggestions", () => {
    it("should list all suggestions", async () => {
      const mockSuggestions = [createMockSuggestion(), createMockSuggestion()];
      suggestionHandlers.getSuggestionsByWorkspaceHandler.execute.mockResolvedValue(
        mockSuggestions,
      );

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/suggestions`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
    });

    it("should filter pending suggestions only", async () => {
      const mockSuggestions = [createMockSuggestion(mockSuggestionId, null)];
      suggestionHandlers.getPendingSuggestionsByWorkspaceHandler.execute.mockResolvedValue(
        mockSuggestions,
      );

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/suggestions?pendingOnly=true`,
      });

      expect(response.statusCode).toBe(200);
    });

    it("should return 400 for invalid workspaceId", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/invalid-uuid/suggestions`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/suggestions/:suggestionId - Get Suggestion
  // ==========================================================================
  describe("GET /:workspaceId/suggestions/:suggestionId", () => {
    it("should get suggestion by ID", async () => {
      const mockSuggestion = createMockSuggestion();
      suggestionHandlers.getSuggestionByIdHandler.execute.mockResolvedValue(
        mockSuggestion,
      );

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/suggestions/${mockSuggestionId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it("should return 404 for non-existent suggestion", async () => {
      suggestionHandlers.getSuggestionByIdHandler.execute.mockRejectedValue(
        new CategorySuggestionNotFoundError(mockSuggestionId),
      );

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/suggestions/${mockSuggestionId}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/suggestions/expense/:expenseId - Get Suggestions by Expense
  // ==========================================================================
  describe("GET /:workspaceId/suggestions/expense/:expenseId", () => {
    it("should get suggestions for expense", async () => {
      const mockSuggestions = [createMockSuggestion()];
      suggestionHandlers.getSuggestionsByExpenseHandler.execute.mockResolvedValue(
        mockSuggestions,
      );

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/suggestions/expense/${mockExpenseId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it("should return empty array when no suggestions for expense", async () => {
      suggestionHandlers.getSuggestionsByExpenseHandler.execute.mockResolvedValue(
        [],
      );

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/suggestions/expense/${mockExpenseId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it("should return 400 for invalid expenseId format", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/suggestions/expense/not-a-uuid`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // PATCH /:workspaceId/suggestions/:suggestionId/accept - Accept Suggestion
  // ==========================================================================
  describe("PATCH /:workspaceId/suggestions/:suggestionId/accept", () => {
    it("should accept suggestion successfully", async () => {
      const mockSuggestion = createMockSuggestion(mockSuggestionId, true);
      suggestionHandlers.acceptSuggestionHandler.execute.mockResolvedValue(
        mockSuggestion,
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/suggestions/${mockSuggestionId}/accept`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it("should return 404 for non-existent suggestion", async () => {
      suggestionHandlers.acceptSuggestionHandler.execute.mockRejectedValue(
        new CategorySuggestionNotFoundError(mockSuggestionId),
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/suggestions/${mockSuggestionId}/accept`,
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 409 for already responded suggestion", async () => {
      suggestionHandlers.acceptSuggestionHandler.execute.mockRejectedValue(
        new SuggestionAlreadyRespondedError(mockSuggestionId),
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/suggestions/${mockSuggestionId}/accept`,
      });

      expect(response.statusCode).toBe(409);
    });
  });

  // ==========================================================================
  // PATCH /:workspaceId/suggestions/:suggestionId/reject - Reject Suggestion
  // ==========================================================================
  describe("PATCH /:workspaceId/suggestions/:suggestionId/reject", () => {
    it("should reject suggestion successfully", async () => {
      const mockSuggestion = createMockSuggestion(mockSuggestionId, false);
      suggestionHandlers.rejectSuggestionHandler.execute.mockResolvedValue(
        mockSuggestion,
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/suggestions/${mockSuggestionId}/reject`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it("should return 404 for non-existent suggestion", async () => {
      suggestionHandlers.rejectSuggestionHandler.execute.mockRejectedValue(
        new CategorySuggestionNotFoundError(mockSuggestionId),
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/suggestions/${mockSuggestionId}/reject`,
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 409 for already responded suggestion", async () => {
      suggestionHandlers.rejectSuggestionHandler.execute.mockRejectedValue(
        new SuggestionAlreadyRespondedError(mockSuggestionId),
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/${mockWorkspaceId}/suggestions/${mockSuggestionId}/reject`,
      });

      expect(response.statusCode).toBe(409);
    });
  });

  // ==========================================================================
  // DELETE /:workspaceId/suggestions/:suggestionId - Delete Suggestion
  // ==========================================================================
  describe("DELETE /:workspaceId/suggestions/:suggestionId", () => {
    it("should delete suggestion successfully", async () => {
      suggestionHandlers.deleteSuggestionHandler.execute.mockResolvedValue(
        undefined,
      );

      const response = await app.inject({
        method: "DELETE",
        url: `/${mockWorkspaceId}/suggestions/${mockSuggestionId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it("should return 404 for non-existent suggestion", async () => {
      suggestionHandlers.deleteSuggestionHandler.execute.mockRejectedValue(
        new CategorySuggestionNotFoundError(mockSuggestionId),
      );

      const response = await app.inject({
        method: "DELETE",
        url: `/${mockWorkspaceId}/suggestions/${mockSuggestionId}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});

// ============================================================================
// RULE EXECUTION ROUTES TESTS
// ============================================================================

describe("Rule Execution Routes", () => {
  let app: FastifyInstance;
  let ruleHandlers: ReturnType<typeof createMockRuleHandlers>;
  let suggestionHandlers: ReturnType<typeof createMockSuggestionHandlers>;
  let executionHandlers: ReturnType<typeof createMockExecutionHandlers>;

  beforeEach(async () => {
    ruleHandlers = createMockRuleHandlers();
    suggestionHandlers = createMockSuggestionHandlers();
    executionHandlers = createMockExecutionHandlers();
    app = await setupTestApp(
      ruleHandlers,
      suggestionHandlers,
      executionHandlers,
    );
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // POST /:workspaceId/evaluate - Evaluate Rules
  // ==========================================================================
  describe("POST /:workspaceId/evaluate", () => {
    const validPayload = {
      expenseId: mockExpenseId,
      expenseData: {
        merchant: "Amazon",
        description: "Office supplies",
        amount: 150.0,
        paymentMethod: "CREDIT_CARD",
      },
    };

    it("should evaluate rules successfully", async () => {
      const mockResult = {
        matchedRules: [createMockRule()],
        appliedCategory: mockCategoryId,
        executions: [createMockExecution()],
      };
      executionHandlers.evaluateRulesHandler.execute.mockResolvedValue(
        mockResult,
      );

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/evaluate`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it("should return 400 for missing expenseId", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/evaluate`,
        payload: { expenseData: validPayload.expenseData },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for missing expenseData", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/evaluate`,
        payload: { expenseId: mockExpenseId },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for missing amount in expenseData", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/evaluate`,
        payload: {
          expenseId: mockExpenseId,
          expenseData: { merchant: "Amazon" },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for negative amount", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/evaluate`,
        payload: {
          ...validPayload,
          expenseData: { ...validPayload.expenseData, amount: -100 },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid expenseId format", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/evaluate`,
        payload: { ...validPayload, expenseId: "not-a-uuid" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should handle no matching rules gracefully", async () => {
      const mockResult = {
        matchedRules: [],
        appliedCategory: null,
        executions: [],
      };
      executionHandlers.evaluateRulesHandler.execute.mockResolvedValue(
        mockResult,
      );

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/evaluate`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.matchedRules).toHaveLength(0);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/executions/expense/:expenseId - Get Executions by Expense
  // ==========================================================================
  describe("GET /:workspaceId/executions/expense/:expenseId", () => {
    it("should get executions for expense", async () => {
      const mockExecutions = [createMockExecution()];
      executionHandlers.getExecutionsByExpenseHandler.execute.mockResolvedValue(
        mockExecutions,
      );

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/executions/expense/${mockExpenseId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("should return empty array when no executions for expense", async () => {
      executionHandlers.getExecutionsByExpenseHandler.execute.mockResolvedValue(
        [],
      );

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/executions/expense/${mockExpenseId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(0);
    });

    it("should return 400 for invalid expenseId format", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/executions/expense/not-a-uuid`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/executions - Get Executions by Workspace
  // ==========================================================================
  describe("GET /:workspaceId/executions", () => {
    it("should get executions for workspace", async () => {
      const mockExecutions = [createMockExecution(), createMockExecution()];
      executionHandlers.getExecutionsByWorkspaceHandler.execute.mockResolvedValue(
        mockExecutions,
      );

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/executions`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it("should support limit query parameter", async () => {
      const mockExecutions = [createMockExecution()];
      executionHandlers.getExecutionsByWorkspaceHandler.execute.mockResolvedValue(
        mockExecutions,
      );

      const response = await app.inject({
        method: "GET",
        url: `/${mockWorkspaceId}/executions?limit=10`,
      });

      expect(response.statusCode).toBe(200);
    });

    it("should return 400 for invalid workspaceId", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/invalid-uuid/executions`,
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

// ============================================================================
// SECURITY TESTS
// ============================================================================

describe("Categorization Rules Security", () => {
  let app: FastifyInstance;
  let ruleHandlers: ReturnType<typeof createMockRuleHandlers>;
  let suggestionHandlers: ReturnType<typeof createMockSuggestionHandlers>;
  let executionHandlers: ReturnType<typeof createMockExecutionHandlers>;

  beforeEach(async () => {
    ruleHandlers = createMockRuleHandlers();
    suggestionHandlers = createMockSuggestionHandlers();
    executionHandlers = createMockExecutionHandlers();
    app = await setupTestApp(
      ruleHandlers,
      suggestionHandlers,
      executionHandlers,
    );
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it("should use authenticated user for rule creation", async () => {
    const mockRule = createMockRule();
    ruleHandlers.createRuleHandler.execute.mockResolvedValue(mockRule);

    await app.inject({
      method: "POST",
      url: `/${mockWorkspaceId}/rules`,
      payload: {
        name: "Test Rule",
        conditionType: "MERCHANT_CONTAINS",
        conditionValue: "Amazon",
        targetCategoryId: mockCategoryId,
      },
    });

    expect(ruleHandlers.createRuleHandler.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: mockUserId,
      }),
    );
  });

  it("should reject unauthorized rule updates", async () => {
    ruleHandlers.updateRuleHandler.execute.mockRejectedValue(
      new UnauthorizedRuleAccessError("update"),
    );

    const response = await app.inject({
      method: "PATCH",
      url: `/${mockWorkspaceId}/rules/${mockRuleId}`,
      payload: { name: "Updated" },
    });

    expect(response.statusCode).toBe(403);
  });

  it("should reject unauthorized rule deletion", async () => {
    ruleHandlers.deleteRuleHandler.execute.mockRejectedValue(
      new UnauthorizedRuleAccessError("delete"),
    );

    const response = await app.inject({
      method: "DELETE",
      url: `/${mockWorkspaceId}/rules/${mockRuleId}`,
    });

    expect(response.statusCode).toBe(403);
  });
});

// ============================================================================
// EDGE CASES & INTEGRATION TESTS
// ============================================================================

describe("Categorization Rules Edge Cases", () => {
  let app: FastifyInstance;
  let ruleHandlers: ReturnType<typeof createMockRuleHandlers>;
  let suggestionHandlers: ReturnType<typeof createMockSuggestionHandlers>;
  let executionHandlers: ReturnType<typeof createMockExecutionHandlers>;

  beforeEach(async () => {
    ruleHandlers = createMockRuleHandlers();
    suggestionHandlers = createMockSuggestionHandlers();
    executionHandlers = createMockExecutionHandlers();
    app = await setupTestApp(
      ruleHandlers,
      suggestionHandlers,
      executionHandlers,
    );
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it("should handle unicode characters in rule name", async () => {
    const mockRule = createMockRule();
    ruleHandlers.createRuleHandler.execute.mockResolvedValue(mockRule);

    const response = await app.inject({
      method: "POST",
      url: `/${mockWorkspaceId}/rules`,
      payload: {
        name: "规则 ルール Rule",
        conditionType: "MERCHANT_CONTAINS",
        conditionValue: "Amazon",
        targetCategoryId: mockCategoryId,
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it("should handle special characters in condition value", async () => {
    const mockRule = createMockRule();
    ruleHandlers.createRuleHandler.execute.mockResolvedValue(mockRule);

    const response = await app.inject({
      method: "POST",
      url: `/${mockWorkspaceId}/rules`,
      payload: {
        name: "Test Rule",
        conditionType: "MERCHANT_CONTAINS",
        conditionValue: "Amazon & Co. <test>",
        targetCategoryId: mockCategoryId,
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it("should handle boundary confidence values (0)", async () => {
    const mockSuggestion = createMockSuggestion();
    suggestionHandlers.createSuggestionHandler.execute.mockResolvedValue(
      mockSuggestion,
    );

    const response = await app.inject({
      method: "POST",
      url: `/${mockWorkspaceId}/suggestions`,
      payload: {
        expenseId: mockExpenseId,
        suggestedCategoryId: mockCategoryId,
        confidence: 0,
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it("should handle boundary confidence values (1)", async () => {
    const mockSuggestion = createMockSuggestion();
    suggestionHandlers.createSuggestionHandler.execute.mockResolvedValue(
      mockSuggestion,
    );

    const response = await app.inject({
      method: "POST",
      url: `/${mockWorkspaceId}/suggestions`,
      payload: {
        expenseId: mockExpenseId,
        suggestedCategoryId: mockCategoryId,
        confidence: 1,
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it("should handle very large amount values in evaluation", async () => {
    const mockResult = {
      matchedRules: [],
      appliedCategory: null,
      executions: [],
    };
    executionHandlers.evaluateRulesHandler.execute.mockResolvedValue(
      mockResult,
    );

    const response = await app.inject({
      method: "POST",
      url: `/${mockWorkspaceId}/evaluate`,
      payload: {
        expenseId: mockExpenseId,
        expenseData: {
          amount: 999999999.99,
          merchant: "Test",
        },
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it("should handle concurrent requests gracefully", async () => {
    const mockRules = [createMockRule()];
    ruleHandlers.getRulesByWorkspaceHandler.execute.mockResolvedValue(
      mockRules,
    );

    const requests = Array(5)
      .fill(null)
      .map(() =>
        app.inject({
          method: "GET",
          url: `/${mockWorkspaceId}/rules`,
        }),
      );

    const responses = await Promise.all(requests);
    responses.forEach((response) => {
      expect(response.statusCode).toBe(200);
    });
  });

  it("should handle all condition types", async () => {
    const conditionTypes = [
      "MERCHANT_CONTAINS",
      "MERCHANT_EQUALS",
      "AMOUNT_GREATER_THAN",
      "AMOUNT_LESS_THAN",
      "AMOUNT_EQUALS",
      "DESCRIPTION_CONTAINS",
      "PAYMENT_METHOD_EQUALS",
    ];

    for (const conditionType of conditionTypes) {
      const mockRule = createMockRule();
      ruleHandlers.createRuleHandler.execute.mockResolvedValue(mockRule);

      const response = await app.inject({
        method: "POST",
        url: `/${mockWorkspaceId}/rules`,
        payload: {
          name: `Rule for ${conditionType}`,
          conditionType,
          conditionValue: "test",
          targetCategoryId: mockCategoryId,
        },
      });

      expect(response.statusCode).toBe(201);
    }
  });
});
