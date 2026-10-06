import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@shared/middleware', () => ({
  workspaceAuthorizationMiddleware: async () => {},
  authenticate: async () => {},
}));

vi.mock('@shared/middleware/rate-limiter.middleware', () => ({
  createRateLimiter: () => async () => {},
  RateLimitPresets: {
    writeOperations: { windowMs: 60000, maxRequests: 100 },
    auth: { windowMs: 60000, maxRequests: 100 },
    readOperations: { windowMs: 60000, maxRequests: 100 },
    api: { windowMs: 60000, maxRequests: 100 },
    exports: { windowMs: 60000, maxRequests: 100 },
  },
  userKeyGenerator: () => 'test-user',
  endpointKeyGenerator: () => 'test-endpoint',
  userOrIpKeyGenerator: () => 'test-user',
}));

vi.mock('@shared/middleware/role-authorization.middleware', () => ({
  requireRole: () => async () => {},
  RolePermissions: {
    OWNER_ONLY: async () => {},
    ADMIN_LEVEL: async () => {},
    MANAGER_LEVEL: async () => {},
    MEMBER_LEVEL: async () => {},
  },
  hasRole: () => true,
}));

import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import errorPlugin from '../../../plugins/error';
import { CategoryRuleController } from '../infrastructure/http/controllers/category-rule.controller';
import { CategorySuggestionController } from '../infrastructure/http/controllers/category-suggestion.controller';
import { RuleExecutionController } from '../infrastructure/http/controllers/rule-execution.controller';
import { categoryRuleRoutes } from '../infrastructure/http/routes/category-rule.routes';
import { categorySuggestionRoutes } from '../infrastructure/http/routes/category-suggestion.routes';
import { ruleExecutionRoutes } from '../infrastructure/http/routes/rule-execution.routes';
import {
  CommandResult,
} from '@core/application/cqrs';
import { UserId, WorkspaceId } from '@core/domain/value-objects';
import { CreateSuggestionHandler, AcceptSuggestionHandler, RejectSuggestionHandler, DeleteSuggestionHandler, EvaluateRulesHandler } from '../application/commands';
import { GetSuggestionByIdHandler, GetSuggestionsByExpenseHandler, GetPendingSuggestionsByWorkspaceHandler, GetSuggestionsByWorkspaceHandler,
  GetExecutionsByRuleHandler, GetExecutionsByExpenseHandler, GetExecutionsByWorkspaceHandler,
  GetRuleByIdHandler, GetRulesByWorkspaceHandler, GetActiveRulesByWorkspaceHandler } from '../application/queries';
import { CategoryRuleService } from '../application/services/category-rule.service';
import { CategoryRule } from '../domain/entities/category-rule.entity';
import { RuleCondition } from '../domain/value-objects';
import { RuleConditionType } from '../domain/enums';
import { CategoryId } from '@core/domain/value-objects';

// Create domain errors with statusCode for testing
class CategoryRuleNotFoundError extends Error {
  statusCode = 404;
  constructor(ruleId: string) {
    super(`Category rule with ID ${ruleId} not found`);
    this.name = 'CategoryRuleNotFoundError';
  }
}

class DuplicateRuleNameError extends Error {
  statusCode = 409;
  constructor(name: string) {
    super(`A rule with name "${name}" already exists in this workspace`);
    this.name = 'DuplicateRuleNameError';
  }
}

class CategorySuggestionNotFoundError extends Error {
  statusCode = 404;
  constructor(suggestionId: string) {
    super(`Category suggestion with ID ${suggestionId} not found`);
    this.name = 'CategorySuggestionNotFoundError';
  }
}

class SuggestionAlreadyRespondedError extends Error {
  statusCode = 409;
  constructor(suggestionId: string) {
    super(`Suggestion ${suggestionId} has already been accepted or rejected`);
    this.name = 'SuggestionAlreadyRespondedError';
  }
}

class UnauthorizedRuleAccessError extends Error {
  statusCode = 403;
  constructor(action: string) {
    super(`You are not authorized to ${action} this rule`);
    this.name = 'UnauthorizedRuleAccessError';
  }
}

// Mock data
const mockWorkspaceId = '123e4567-e89b-12d3-a456-426614174000';
const mockUserId = '123e4567-e89b-12d3-a456-426614174001';
const mockRuleId = '123e4567-e89b-12d3-a456-426614174010';
const mockSuggestionId = '123e4567-e89b-12d3-a456-426614174020';
const mockExpenseId = '123e4567-e89b-12d3-a456-426614174030';
const mockCategoryId = '123e4567-e89b-12d3-a456-426614174040';
const mockExecutionId = '123e4567-e89b-12d3-a456-426614174050';

// Helper to create mock CategoryRule response
function createMockRule(
  id: string = mockRuleId,
  name: string = 'Test Rule',
  isActive: boolean = true
) {
  const rule = {
    id,
    workspaceId: mockWorkspaceId,
    name,
    description: 'Test description',
    priority: 10,
    isActive,
    condition: {
      type: 'MERCHANT_CONTAINS',
      value: 'Amazon',
    },
    targetCategoryId: mockCategoryId,
    createdBy: mockUserId,
    createdAt: new Date('2024-01-15T10:30:00Z').toISOString(),
    updatedAt: new Date('2024-01-15T10:30:00Z').toISOString(),
  };
  return { ...rule, toJSON: () => rule };
}

// Helper to create mock CategorySuggestion response
function createMockSuggestion(
  id: string = mockSuggestionId,
  isAccepted: boolean | null = null
) {
  const suggestion = {
    id,
    workspaceId: mockWorkspaceId,
    expenseId: mockExpenseId,
    suggestedCategoryId: mockCategoryId,
    confidence: 0.85,
    reason: 'Merchant match',
    isAccepted,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    respondedAt: isAccepted !== null ? new Date('2024-01-15T11:00:00Z') : null,
  };
  return { ...suggestion, toJSON: () => suggestion };
}

// Helper to create mock RuleExecution response
function createMockExecution(id: string = mockExecutionId) {
  const execution = {
    id,
    workspaceId: mockWorkspaceId,
    ruleId: mockRuleId,
    expenseId: mockExpenseId,
    matched: true,
    appliedCategoryId: mockCategoryId,
    executedAt: new Date('2024-01-15T10:30:00Z'),
  };
  return { ...execution, toJSON: () => execution };
}

// Create mock handlers
function createMockRuleHandlers() {
  return {
    createRuleHandler: { handle: vi.fn() },
    updateRuleHandler: { handle: vi.fn() },
    deleteRuleHandler: { handle: vi.fn() },
    activateRuleHandler: { handle: vi.fn() },
    deactivateRuleHandler: { handle: vi.fn() },
    getRuleByIdHandler: { handle: vi.fn() },
    getRulesByWorkspaceHandler: { handle: vi.fn() },
    getActiveRulesByWorkspaceHandler: { handle: vi.fn() },
    getExecutionsByRuleHandler: { handle: vi.fn() },
  };
}

function createMockSuggestionHandlers() {
  return {
    createSuggestionHandler: { handle: vi.fn() },
    acceptSuggestionHandler: { handle: vi.fn() },
    rejectSuggestionHandler: { handle: vi.fn() },
    deleteSuggestionHandler: { handle: vi.fn() },
    getSuggestionByIdHandler: { handle: vi.fn() },
    getSuggestionsByExpenseHandler: { handle: vi.fn() },
    getPendingSuggestionsByWorkspaceHandler: { handle: vi.fn() },
    getSuggestionsByWorkspaceHandler: { handle: vi.fn() },
  };
}

function createMockExecutionHandlers() {
  return {
    evaluateRulesHandler: { handle: vi.fn() },
    getExecutionsByExpenseHandler: { handle: vi.fn() },
    getExecutionsByWorkspaceHandler: { handle: vi.fn() },
  };
}

// Setup test app with authentication
async function setupTestApp(
  ruleHandlers: ReturnType<typeof createMockRuleHandlers>,
  suggestionHandlers: ReturnType<typeof createMockSuggestionHandlers>,
  executionHandlers: ReturnType<typeof createMockExecutionHandlers>
): Promise<FastifyInstance> {
  const app = Fastify();

  await app.register(errorPlugin);

  // Mock authentication
  app.decorateRequest('user', null);
  app.decorate('authenticate', async (request: FastifyRequest) => {
    request.user = {
      userId: mockUserId,
      workspaceId: mockWorkspaceId,
      email: 'test@example.com',
    };
  });
  app.addHook('preHandler', async (request) => {
    request.user = {
      userId: mockUserId,
      workspaceId: mockWorkspaceId,
      email: 'test@example.com',
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
    ruleHandlers.getExecutionsByRuleHandler as any
  );

  const suggestionController = new CategorySuggestionController(
    suggestionHandlers.createSuggestionHandler as any,
    suggestionHandlers.acceptSuggestionHandler as any,
    suggestionHandlers.rejectSuggestionHandler as any,
    suggestionHandlers.deleteSuggestionHandler as any,
    suggestionHandlers.getSuggestionByIdHandler as any,
    suggestionHandlers.getSuggestionsByExpenseHandler as any,
    suggestionHandlers.getPendingSuggestionsByWorkspaceHandler as any,
    suggestionHandlers.getSuggestionsByWorkspaceHandler as any
  );

  const executionController = new RuleExecutionController(
    executionHandlers.evaluateRulesHandler as any,
    executionHandlers.getExecutionsByExpenseHandler as any,
    executionHandlers.getExecutionsByWorkspaceHandler as any
  );

  await app.register(
    async (instance) => {
      await categoryRuleRoutes(instance, ruleController);
      await categorySuggestionRoutes(instance, suggestionController);
      await ruleExecutionRoutes(instance, executionController);
    },
    { prefix: '/' }
  );

  return app;
}

// ============================================================================
// CATEGORY RULE ROUTES TESTS
// ============================================================================

describe('Category Rule Routes', () => {
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
      executionHandlers
    );
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // POST /:workspaceId/rules - Create Category Rule
  // ==========================================================================
  describe('POST /:workspaceId/rules', () => {
    const validPayload = {
      name: 'Amazon Shopping Rule',
      description: 'Categorize Amazon purchases',
      priority: 10,
      conditionType: 'MERCHANT_CONTAINS',
      conditionValue: 'Amazon',
      targetCategoryId: mockCategoryId,
    };

    it('should create category rule successfully', async () => {
      const mockRule = createMockRule();
      ruleHandlers.createRuleHandler.handle.mockResolvedValue(
        CommandResult.success(mockRule)
      );

      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/rules`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Category rule created successfully');
      expect(body.data).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/rules`,
        payload: { name: 'Test' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid conditionType', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/rules`,
        payload: { ...validPayload, conditionType: 'INVALID_TYPE' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid workspaceId format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/invalid-uuid/rules`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid targetCategoryId format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/rules`,
        payload: { ...validPayload, targetCategoryId: 'not-a-uuid' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for empty name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/rules`,
        payload: { ...validPayload, name: '' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for name exceeding max length', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/rules`,
        payload: { ...validPayload, name: 'A'.repeat(101) },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for negative priority', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/rules`,
        payload: { ...validPayload, priority: -1 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 409 for duplicate rule name', async () => {
      ruleHandlers.createRuleHandler.handle.mockRejectedValue(
        new DuplicateRuleNameError('Amazon Shopping Rule')
      );

      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/rules`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(409);
    });

    it('should handle service errors gracefully', async () => {
      ruleHandlers.createRuleHandler.handle.mockRejectedValue(
        new Error('DB Error')
      );

      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/rules`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(500);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/rules - List Category Rules
  // ==========================================================================
  describe('GET /:workspaceId/rules', () => {
    it('should list all category rules', async () => {
      const mockRules = [
        createMockRule(mockRuleId, 'Rule 1'),
        createMockRule('123e4567-e89b-12d3-a456-426614174011', 'Rule 2'),
      ];
      ruleHandlers.getRulesByWorkspaceHandler.handle.mockResolvedValue({
        items: mockRules,
        total: 2,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/rules`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.items).toHaveLength(2);
      expect(body.data.pagination).toBeDefined();
    });

    it('should filter by active rules only', async () => {
      const mockRules = [createMockRule(mockRuleId, 'Active Rule', true)];
      ruleHandlers.getActiveRulesByWorkspaceHandler.handle.mockResolvedValue({
        items: mockRules,
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/rules?activeOnly=true`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.items).toHaveLength(1);
      expect(body.data.pagination).toBeDefined();
    });

    it('should return empty array when no rules exist', async () => {
      ruleHandlers.getRulesByWorkspaceHandler.handle.mockResolvedValue({
        items: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/rules`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.items).toHaveLength(0);
      expect(body.data.pagination).toBeDefined();
    });

    it('should return 400 for invalid workspaceId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/invalid-uuid/rules`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/rules/:ruleId - Get Category Rule
  // ==========================================================================
  describe('GET /:workspaceId/rules/:ruleId', () => {
    it('should get category rule by ID', async () => {
      const mockRule = createMockRule();
      ruleHandlers.getRuleByIdHandler.handle.mockResolvedValue(mockRule);

      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it('should return 404 for non-existent rule', async () => {
      ruleHandlers.getRuleByIdHandler.handle.mockRejectedValue(
        new CategoryRuleNotFoundError(mockRuleId)
      );

      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}`,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for invalid ruleId format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/rules/invalid-uuid`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // PATCH /:workspaceId/rules/:ruleId - Update Category Rule
  // ==========================================================================
  describe('PATCH /:workspaceId/rules/:ruleId', () => {
    it('should update category rule name', async () => {
      const mockRule = createMockRule();
      ruleHandlers.updateRuleHandler.handle.mockResolvedValue(
        CommandResult.success(mockRule)
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}`,
        payload: { name: 'Updated Rule Name' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should update category rule priority', async () => {
      const mockRule = createMockRule();
      ruleHandlers.updateRuleHandler.handle.mockResolvedValue(
        CommandResult.success(mockRule)
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}`,
        payload: { priority: 20 },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should update category rule condition', async () => {
      const mockRule = createMockRule();
      ruleHandlers.updateRuleHandler.handle.mockResolvedValue(
        CommandResult.success(mockRule)
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}`,
        payload: {
          conditionType: 'AMOUNT_GREATER_THAN',
          conditionValue: '100',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 for non-existent rule', async () => {
      ruleHandlers.updateRuleHandler.handle.mockRejectedValue(
        new CategoryRuleNotFoundError(mockRuleId)
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}`,
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for empty name', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}`,
        payload: { name: '' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 403 for unauthorized access', async () => {
      ruleHandlers.updateRuleHandler.handle.mockRejectedValue(
        new UnauthorizedRuleAccessError('update')
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}`,
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // DELETE /:workspaceId/rules/:ruleId - Delete Category Rule
  // ==========================================================================
  describe('DELETE /:workspaceId/rules/:ruleId', () => {
    it('should delete category rule', async () => {
      ruleHandlers.deleteRuleHandler.handle.mockResolvedValue(
        CommandResult.success(undefined)
      );

      const response = await app.inject({
        method: 'DELETE',
        url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}`,
      });

      expect(response.statusCode).toBe(204);
    });

    it('should return 404 for non-existent rule', async () => {
      ruleHandlers.deleteRuleHandler.handle.mockRejectedValue(
        new CategoryRuleNotFoundError(mockRuleId)
      );

      const response = await app.inject({
        method: 'DELETE',
        url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}`,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for invalid ruleId format', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/workspaces/${mockWorkspaceId}/rules/not-a-uuid`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // PATCH /:workspaceId/rules/:ruleId/activate - Activate Rule
  // ==========================================================================
  describe('PATCH /:workspaceId/rules/:ruleId/activate', () => {
    it('should activate category rule', async () => {
      const mockRule = createMockRule(mockRuleId, 'Test', true);
      ruleHandlers.activateRuleHandler.handle.mockResolvedValue(
        CommandResult.success(mockRule)
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}/activate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent rule', async () => {
      ruleHandlers.activateRuleHandler.handle.mockRejectedValue(
        new CategoryRuleNotFoundError(mockRuleId)
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}/activate`,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for invalid ruleId', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/workspaces/${mockWorkspaceId}/rules/invalid-uuid/activate`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // PATCH /:workspaceId/rules/:ruleId/deactivate - Deactivate Rule
  // ==========================================================================
  describe('PATCH /:workspaceId/rules/:ruleId/deactivate', () => {
    it('should deactivate category rule', async () => {
      const mockRule = createMockRule(mockRuleId, 'Test', false);
      ruleHandlers.deactivateRuleHandler.handle.mockResolvedValue(
        CommandResult.success(mockRule)
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}/deactivate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent rule', async () => {
      ruleHandlers.deactivateRuleHandler.handle.mockRejectedValue(
        new CategoryRuleNotFoundError(mockRuleId)
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}/deactivate`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/rules/:ruleId/executions - Get Rule Executions
  // ==========================================================================
  describe('GET /:workspaceId/rules/:ruleId/executions', () => {
    it('should get rule executions', async () => {
      const mockExecutions = [createMockExecution()];
      ruleHandlers.getExecutionsByRuleHandler.handle.mockResolvedValue({
        items: mockExecutions,
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}/executions`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.items).toBeDefined();
    });

    it('should return empty array when no executions', async () => {
      ruleHandlers.getExecutionsByRuleHandler.handle.mockResolvedValue({
        items: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}/executions`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.items).toHaveLength(0);
    });
  });
});

// ============================================================================
// CATEGORY SUGGESTION ROUTES TESTS
// ============================================================================

describe('Category Suggestion Routes', () => {
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
      executionHandlers
    );
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // POST /:workspaceId/suggestions - Create Suggestion
  // ==========================================================================
  describe('POST /:workspaceId/suggestions', () => {
    const validPayload = {
      expenseId: mockExpenseId,
      suggestedCategoryId: mockCategoryId,
      confidence: 0.85,
      reason: 'Merchant pattern match',
    };

    it('should create suggestion successfully', async () => {
      const mockSuggestion = createMockSuggestion();
      suggestionHandlers.createSuggestionHandler.handle.mockResolvedValue(
        CommandResult.success(mockSuggestion)
      );

      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/suggestions`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/suggestions`,
        payload: { expenseId: mockExpenseId },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid confidence (> 1)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/suggestions`,
        payload: { ...validPayload, confidence: 1.5 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid confidence (< 0)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/suggestions`,
        payload: { ...validPayload, confidence: -0.1 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid expenseId format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/suggestions`,
        payload: { ...validPayload, expenseId: 'not-a-uuid' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/suggestions - List Suggestions
  // ==========================================================================
  describe('GET /:workspaceId/suggestions', () => {
    it('should list all suggestions', async () => {
      const mockSuggestions = [createMockSuggestion(), createMockSuggestion()];
      suggestionHandlers.getSuggestionsByWorkspaceHandler.handle.mockResolvedValue({
        items: mockSuggestions,
        total: 2,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/suggestions`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.items).toHaveLength(2);
    });

    it('should filter pending suggestions only', async () => {
      const mockSuggestions = [createMockSuggestion(mockSuggestionId, null)];
      suggestionHandlers.getPendingSuggestionsByWorkspaceHandler.handle.mockResolvedValue({
        items: mockSuggestions,
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/suggestions?pendingOnly=true`,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 for invalid workspaceId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/invalid-uuid/suggestions`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/suggestions/:suggestionId - Get Suggestion
  // ==========================================================================
  describe('GET /:workspaceId/suggestions/:suggestionId', () => {
    it('should get suggestion by ID', async () => {
      const mockSuggestion = createMockSuggestion();
      suggestionHandlers.getSuggestionByIdHandler.handle.mockResolvedValue(mockSuggestion);

      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/suggestions/${mockSuggestionId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent suggestion', async () => {
      suggestionHandlers.getSuggestionByIdHandler.handle.mockRejectedValue(
        new CategorySuggestionNotFoundError(mockSuggestionId)
      );

      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/suggestions/${mockSuggestionId}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/suggestions/expense/:expenseId - Get Suggestions by Expense
  // ==========================================================================
  describe('GET /:workspaceId/suggestions/expense/:expenseId', () => {
    it('should get suggestions for expense', async () => {
      const mockSuggestions = [createMockSuggestion()];
      suggestionHandlers.getSuggestionsByExpenseHandler.handle.mockResolvedValue({ items: mockSuggestions, total: mockSuggestions.length, limit: 10, offset: 0, hasMore: false });

      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/suggestions/expense/${mockExpenseId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return empty array when no suggestions for expense', async () => {
      suggestionHandlers.getSuggestionsByExpenseHandler.handle.mockResolvedValue({ items: [], total: 0, limit: 10, offset: 0, hasMore: false });

      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/suggestions/expense/${mockExpenseId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.items).toEqual([]);
    });

    it('should return 400 for invalid expenseId format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/suggestions/expense/not-a-uuid`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // PATCH /:workspaceId/suggestions/:suggestionId/accept - Accept Suggestion
  // ==========================================================================
  describe('PATCH /:workspaceId/suggestions/:suggestionId/accept', () => {
    it('should accept suggestion successfully', async () => {
      suggestionHandlers.acceptSuggestionHandler.handle.mockResolvedValue(
        CommandResult.success(undefined)
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/workspaces/${mockWorkspaceId}/suggestions/${mockSuggestionId}/accept`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent suggestion', async () => {
      suggestionHandlers.acceptSuggestionHandler.handle.mockRejectedValue(
        new CategorySuggestionNotFoundError(mockSuggestionId)
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/workspaces/${mockWorkspaceId}/suggestions/${mockSuggestionId}/accept`,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 409 for already responded suggestion', async () => {
      suggestionHandlers.acceptSuggestionHandler.handle.mockRejectedValue(
        new SuggestionAlreadyRespondedError(mockSuggestionId)
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/workspaces/${mockWorkspaceId}/suggestions/${mockSuggestionId}/accept`,
      });

      expect(response.statusCode).toBe(409);
    });
  });

  // ==========================================================================
  // PATCH /:workspaceId/suggestions/:suggestionId/reject - Reject Suggestion
  // ==========================================================================
  describe('PATCH /:workspaceId/suggestions/:suggestionId/reject', () => {
    it('should reject suggestion successfully', async () => {
      suggestionHandlers.rejectSuggestionHandler.handle.mockResolvedValue(
        CommandResult.success(undefined)
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/workspaces/${mockWorkspaceId}/suggestions/${mockSuggestionId}/reject`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent suggestion', async () => {
      suggestionHandlers.rejectSuggestionHandler.handle.mockRejectedValue(
        new CategorySuggestionNotFoundError(mockSuggestionId)
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/workspaces/${mockWorkspaceId}/suggestions/${mockSuggestionId}/reject`,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 409 for already responded suggestion', async () => {
      suggestionHandlers.rejectSuggestionHandler.handle.mockRejectedValue(
        new SuggestionAlreadyRespondedError(mockSuggestionId)
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/workspaces/${mockWorkspaceId}/suggestions/${mockSuggestionId}/reject`,
      });

      expect(response.statusCode).toBe(409);
    });
  });

  // ==========================================================================
  // DELETE /:workspaceId/suggestions/:suggestionId - Delete Suggestion
  // ==========================================================================
  describe('DELETE /:workspaceId/suggestions/:suggestionId', () => {
    it('should delete suggestion successfully', async () => {
      suggestionHandlers.deleteSuggestionHandler.handle.mockResolvedValue(
        CommandResult.success(undefined)
      );

      const response = await app.inject({
        method: 'DELETE',
        url: `/workspaces/${mockWorkspaceId}/suggestions/${mockSuggestionId}`,
      });

      expect(response.statusCode).toBe(204);
    });

    it('should return 404 for non-existent suggestion', async () => {
      suggestionHandlers.deleteSuggestionHandler.handle.mockRejectedValue(
        new CategorySuggestionNotFoundError(mockSuggestionId)
      );

      const response = await app.inject({
        method: 'DELETE',
        url: `/workspaces/${mockWorkspaceId}/suggestions/${mockSuggestionId}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});

// ============================================================================
// RULE EXECUTION ROUTES TESTS
// ============================================================================

describe('Rule Execution Routes', () => {
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
      executionHandlers
    );
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // POST /:workspaceId/evaluate - Evaluate Rules
  // ==========================================================================
  describe('POST /:workspaceId/evaluate', () => {
    const validPayload = {
      expenseId: mockExpenseId,
      expenseData: {
        merchant: 'Amazon',
        description: 'Office supplies',
        amount: 150.0,
        paymentMethod: 'CREDIT_CARD',
      },
    };

    it('should evaluate rules successfully', async () => {
      const mockRule = createMockRule();
      const mockExecution = createMockExecution();
      const mockResult = {
        appliedRule: mockRule.toJSON(),
        suggestedCategoryId: mockCategoryId,
        execution: {
          id: mockExecution.id,
          ruleId: mockExecution.ruleId,
          expenseId: mockExecution.expenseId,
          workspaceId: mockWorkspaceId,
          appliedCategoryId: mockExecution.appliedCategoryId,
          executedAt: mockExecution.executedAt,
        },
        suggestion: createMockSuggestion().toJSON(),
      };
      executionHandlers.evaluateRulesHandler.handle.mockResolvedValue(
        CommandResult.success(mockResult)
      );

      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/evaluate`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.appliedRule.targetCategoryId).toBe(mockCategoryId);
      expect(body.data.suggestion.id).toBe(mockSuggestionId);
    });

    it('should return 400 for missing expenseId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/evaluate`,
        payload: { expenseData: validPayload.expenseData },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for missing expenseData', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/evaluate`,
        payload: { expenseId: mockExpenseId },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for missing amount in expenseData', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/evaluate`,
        payload: {
          expenseId: mockExpenseId,
          expenseData: { merchant: 'Amazon' },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for negative amount', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/evaluate`,
        payload: {
          ...validPayload,
          expenseData: { ...validPayload.expenseData, amount: -100 },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid expenseId format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/evaluate`,
        payload: { ...validPayload, expenseId: 'not-a-uuid' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle no matching rules gracefully', async () => {
      const mockResult = {
        appliedRule: null,
        suggestedCategoryId: null,
        execution: null,
        suggestion: null,
      };
      executionHandlers.evaluateRulesHandler.handle.mockResolvedValue(
        CommandResult.success(mockResult)
      );

      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/evaluate`,
        payload: validPayload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.appliedRule).toBeNull();
      expect(body.data.suggestedCategoryId).toBeNull();
      expect(body.data.execution).toBeNull();
    });
  });

  // ==========================================================================
  // GET /:workspaceId/executions/expense/:expenseId - Get Executions by Expense
  // ==========================================================================
  describe('GET /:workspaceId/executions/expense/:expenseId', () => {
    it('should get executions for expense', async () => {
      const mockExecutions = [createMockExecution()];
      executionHandlers.getExecutionsByExpenseHandler.handle.mockResolvedValue({ items: mockExecutions, total: mockExecutions.length, limit: 10, offset: 0, hasMore: false });

      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/executions/expense/${mockExpenseId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it('should return empty array when no executions for expense', async () => {
      executionHandlers.getExecutionsByExpenseHandler.handle.mockResolvedValue({ items: [], total: 0, limit: 10, offset: 0, hasMore: false });

      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/executions/expense/${mockExpenseId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.items).toHaveLength(0);
    });

    it('should return 400 for invalid expenseId format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/executions/expense/not-a-uuid`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // GET /:workspaceId/executions - Get Executions by Workspace
  // ==========================================================================
  describe('GET /:workspaceId/executions', () => {
    it('should get executions for workspace', async () => {
      const mockExecutions = [createMockExecution(), createMockExecution()];
      executionHandlers.getExecutionsByWorkspaceHandler.handle.mockResolvedValue({
        items: mockExecutions,
        total: 2,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/executions`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should support limit query parameter', async () => {
      const mockExecutions = [createMockExecution()];
      executionHandlers.getExecutionsByWorkspaceHandler.handle.mockResolvedValue({
        items: mockExecutions,
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/executions?limit=10`,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 for invalid workspaceId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/invalid-uuid/executions`,
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

// ============================================================================
// SECURITY TESTS
// ============================================================================

describe('Categorization Rules Security', () => {
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
      executionHandlers
    );
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('should use authenticated user for rule creation', async () => {
    const mockRule = createMockRule();
    ruleHandlers.createRuleHandler.handle.mockResolvedValue(
      CommandResult.success({ ruleId: mockRule.id })
    );

    await app.inject({
      method: 'POST',
      url: `/workspaces/${mockWorkspaceId}/rules`,
      payload: {
        name: 'Test Rule',
        conditionType: 'MERCHANT_CONTAINS',
        conditionValue: 'Amazon',
        targetCategoryId: mockCategoryId,
      },
    });

    expect(ruleHandlers.createRuleHandler.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: mockUserId,
      })
    );
  });

  it('should reject unauthorized rule updates', async () => {
    ruleHandlers.updateRuleHandler.handle.mockRejectedValue(
      new UnauthorizedRuleAccessError('update')
    );

    const response = await app.inject({
      method: 'PATCH',
      url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}`,
      payload: { name: 'Updated' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('should reject unauthorized rule deletion', async () => {
    ruleHandlers.deleteRuleHandler.handle.mockRejectedValue(
      new UnauthorizedRuleAccessError('delete')
    );

    const response = await app.inject({
      method: 'DELETE',
      url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}`,
    });

    expect(response.statusCode).toBe(403);
  });
});

// ============================================================================
// EDGE CASES & INTEGRATION TESTS
// ============================================================================

describe('Categorization Rules Edge Cases', () => {
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
      executionHandlers
    );
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('should handle unicode characters in rule name', async () => {
    const mockRule = createMockRule();
    ruleHandlers.createRuleHandler.handle.mockResolvedValue(
      CommandResult.success(mockRule)
    );

    const response = await app.inject({
      method: 'POST',
      url: `/workspaces/${mockWorkspaceId}/rules`,
      payload: {
        name: '规则 ルール Rule',
        conditionType: 'MERCHANT_CONTAINS',
        conditionValue: 'Amazon',
        targetCategoryId: mockCategoryId,
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it('should handle special characters in condition value', async () => {
    const mockRule = createMockRule();
    ruleHandlers.createRuleHandler.handle.mockResolvedValue(
      CommandResult.success(mockRule)
    );

    const response = await app.inject({
      method: 'POST',
      url: `/workspaces/${mockWorkspaceId}/rules`,
      payload: {
        name: 'Test Rule',
        conditionType: 'MERCHANT_CONTAINS',
        conditionValue: 'Amazon & Co. <test>',
        targetCategoryId: mockCategoryId,
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it('should handle boundary confidence values (0)', async () => {
    const mockSuggestion = createMockSuggestion();
    suggestionHandlers.createSuggestionHandler.handle.mockResolvedValue(
      CommandResult.success(mockSuggestion)
    );

    const response = await app.inject({
      method: 'POST',
      url: `/workspaces/${mockWorkspaceId}/suggestions`,
      payload: {
        expenseId: mockExpenseId,
        suggestedCategoryId: mockCategoryId,
        confidence: 0,
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it('should handle boundary confidence values (1)', async () => {
    const mockSuggestion = createMockSuggestion();
    suggestionHandlers.createSuggestionHandler.handle.mockResolvedValue(
      CommandResult.success(mockSuggestion)
    );

    const response = await app.inject({
      method: 'POST',
      url: `/workspaces/${mockWorkspaceId}/suggestions`,
      payload: {
        expenseId: mockExpenseId,
        suggestedCategoryId: mockCategoryId,
        confidence: 1,
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it('should handle very large amount values in evaluation', async () => {
    const mockResult = {
      appliedRule: null,
      suggestedCategoryId: null,
      execution: null,
      suggestion: null,
    };
    executionHandlers.evaluateRulesHandler.handle.mockResolvedValue(
      CommandResult.success(mockResult)
    );

    const response = await app.inject({
      method: 'POST',
      url: `/workspaces/${mockWorkspaceId}/evaluate`,
      payload: {
        expenseId: mockExpenseId,
        expenseData: {
          amount: 999999999.99,
          merchant: 'Test',
        },
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it('should handle concurrent requests gracefully', async () => {
    const mockRules = [createMockRule()];
    ruleHandlers.getRulesByWorkspaceHandler.handle.mockResolvedValue({
      items: mockRules,
      total: 1,
      limit: 10,
      offset: 0,
      hasMore: false,
    });

    const requests = Array(5)
      .fill(null)
      .map(() =>
        app.inject({
          method: 'GET',
          url: `/workspaces/${mockWorkspaceId}/rules`,
        })
      );

    const responses = await Promise.all(requests);
    responses.forEach((response) => {
      expect(response.statusCode).toBe(200);
    });
  });

  it('should handle all condition types', async () => {
    const conditionTypes = [
      'MERCHANT_CONTAINS',
      'MERCHANT_EQUALS',
      'AMOUNT_GREATER_THAN',
      'AMOUNT_LESS_THAN',
      'AMOUNT_EQUALS',
      'DESCRIPTION_CONTAINS',
      'PAYMENT_METHOD_EQUALS',
    ];

    for (const conditionType of conditionTypes) {
      const mockRule = createMockRule();
      ruleHandlers.createRuleHandler.handle.mockResolvedValue(
        CommandResult.success(mockRule)
      );

      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/rules`,
        payload: {
          name: `Rule for ${conditionType}`,
          conditionType,
          conditionValue: 'test',
          targetCategoryId: mockCategoryId,
        },
      });

      expect(response.statusCode).toBe(201);
    }
  });
});

// Middleware is mocked above; these tests deliberately run real command handlers
// to verify the application boundary independently of route membership guards.
describe('Command authorization through HTTP', () => {
  let app: FastifyInstance;
  let ruleHandlers: ReturnType<typeof createMockRuleHandlers>;
  let suggestionHandlers: ReturnType<typeof createMockSuggestionHandlers>;
  let executionHandlers: ReturnType<typeof createMockExecutionHandlers>;
  const access = { isAdminOrOwner: vi.fn(), isMember: vi.fn() };
  const writes = { getSuggestionById: vi.fn(), createSuggestion: vi.fn(), acceptSuggestion: vi.fn(), rejectSuggestion: vi.fn(), deleteSuggestion: vi.fn(), evaluateAndApplyRules: vi.fn() };
  const acceptance = { validate: vi.fn().mockResolvedValue({ expenseVersion: 1 }) };
  beforeEach(async () => {
    vi.clearAllMocks();
    ruleHandlers = createMockRuleHandlers(); suggestionHandlers = createMockSuggestionHandlers(); executionHandlers = createMockExecutionHandlers();
    suggestionHandlers.createSuggestionHandler.handle.mockImplementation(command => new CreateSuggestionHandler(writes, access, { readExpense: vi.fn().mockResolvedValue({ expenseOwnerId: mockUserId, expenseData: { amount: 1 } }), ensureCategory: vi.fn() }).handle(command));
    suggestionHandlers.acceptSuggestionHandler.handle.mockImplementation(command => new AcceptSuggestionHandler(writes, access, acceptance).handle(command));
    suggestionHandlers.rejectSuggestionHandler.handle.mockImplementation(command => new RejectSuggestionHandler(writes, access).handle(command));
    suggestionHandlers.deleteSuggestionHandler.handle.mockImplementation(command => new DeleteSuggestionHandler(writes, access).handle(command));
    executionHandlers.evaluateRulesHandler.handle.mockImplementation(command => new EvaluateRulesHandler(writes, access, { readExpense: vi.fn().mockResolvedValue({ expenseOwnerId: mockUserId, expenseData: { amount: 1 } }), ensureCategory: vi.fn() }).handle(command));
    writes.createSuggestion.mockResolvedValue(createMockSuggestion());
    writes.acceptSuggestion.mockResolvedValue(createMockSuggestion());
    writes.getSuggestionById.mockResolvedValue(createMockSuggestion());
    writes.rejectSuggestion.mockResolvedValue(createMockSuggestion());
    writes.deleteSuggestion.mockResolvedValue(undefined);
    writes.evaluateAndApplyRules.mockResolvedValue({ appliedRule: null, suggestedCategoryId: null, execution: null, suggestion: null });
    app = await setupTestApp(ruleHandlers, suggestionHandlers, executionHandlers);
  });
  afterEach(async () => { await app.close(); });
  const endpoints = [
    { method: 'POST' as const, path: 'suggestions', key: 'createSuggestion' as const, status: 201, payload: { expenseId: mockExpenseId, suggestedCategoryId: mockCategoryId, confidence: 0.9 } },
    { method: 'PATCH' as const, path: `suggestions/${mockSuggestionId}/accept`, key: 'acceptSuggestion' as const, status: 200 },
    { method: 'PATCH' as const, path: `suggestions/${mockSuggestionId}/reject`, key: 'rejectSuggestion' as const, status: 200 },
    { method: 'DELETE' as const, path: `suggestions/${mockSuggestionId}`, key: 'deleteSuggestion' as const, status: 204 },
    { method: 'POST' as const, path: 'evaluate', key: 'evaluateAndApplyRules' as const, status: 200, payload: { expenseId: mockExpenseId, expenseData: { amount: 1 } } },
  ];
  it.each(endpoints)('$key rejects denied actors with the real command handler', async endpoint => {
    access.isAdminOrOwner.mockResolvedValue(false);
    const response = await app.inject({ method: endpoint.method, url: `/workspaces/${mockWorkspaceId}/${endpoint.path}`, payload: endpoint.payload });
    expect(response.statusCode).toBe(403); expect(writes[endpoint.key]).not.toHaveBeenCalled();
    expect(access.isAdminOrOwner).toHaveBeenCalledTimes(1);
  });
  it.each(endpoints)('$key propagates an unavailable authorization dependency', async endpoint => {
    access.isAdminOrOwner.mockRejectedValue(Object.assign(new Error('Identity unavailable'), { statusCode: 503 }));
    const response = await app.inject({ method: endpoint.method, url: `/workspaces/${mockWorkspaceId}/${endpoint.path}`, payload: endpoint.payload });
    expect(response.statusCode).toBe(503); expect(writes[endpoint.key]).not.toHaveBeenCalled();
  });
  it.each(endpoints)('$key passes the authenticated actor and checks access exactly once', async endpoint => {
    access.isAdminOrOwner.mockResolvedValue(true);
    const response = await app.inject({ method: endpoint.method, url: `/workspaces/${mockWorkspaceId}/${endpoint.path}`, payload: endpoint.payload });
    expect(response.statusCode).toBe(endpoint.status); expect(writes[endpoint.key]).toHaveBeenCalledTimes(1);
    expect(access.isAdminOrOwner).toHaveBeenCalledTimes(1);
    expect(access.isAdminOrOwner).toHaveBeenCalledWith(UserId.fromString(mockUserId), WorkspaceId.fromString(mockWorkspaceId));
  });
  it('preserves an explicit null description through the controller', async () => {
    ruleHandlers.updateRuleHandler.handle.mockResolvedValue(CommandResult.success(createMockRule()));
    const response = await app.inject({ method: 'PATCH', url: `/workspaces/${mockWorkspaceId}/rules/${mockRuleId}`, payload: { description: null } });
    expect(response.statusCode).toBe(200);
    expect(ruleHandlers.updateRuleHandler.handle).toHaveBeenCalledWith(expect.objectContaining({ description: null, userId: mockUserId }));
  });
});

// Run real query handlers even though middleware is mocked in this test file.
describe('Query authorization and pagination through HTTP', () => {
  let app: FastifyInstance;
  const access = { isMember: vi.fn(), isAdminOrOwner: vi.fn() };
  const ruleRepo = { save: vi.fn(), delete: vi.fn(), findById: vi.fn(), findByName: vi.fn(), findIncludingDeleted: vi.fn(), findByWorkspaceId: vi.fn(), findActiveByWorkspaceId: vi.fn() };
  const suggestionReads = { getSuggestionById: vi.fn(), getSuggestionsByExpenseId: vi.fn(), getSuggestionsByWorkspaceId: vi.fn(), getPendingSuggestionsByWorkspaceId: vi.fn() };
  const executionReads = { getExecutionsByRuleId: vi.fn(), getExecutionsByExpenseId: vi.fn(), getExecutionsByWorkspaceId: vi.fn() };
  const page = <T>(items: T[]) => ({ items, total: 75, limit: 10, offset: 50, hasMore: true });
  beforeEach(async () => {
    vi.clearAllMocks();
    const rules = createMockRuleHandlers(), suggestions = createMockSuggestionHandlers(), executions = createMockExecutionHandlers();
    const rule = CategoryRule.create({ workspaceId: WorkspaceId.fromString(mockWorkspaceId), createdBy: UserId.fromString(mockUserId), name: 'Rule',
      targetCategoryId: CategoryId.fromString(mockCategoryId), condition: RuleCondition.create(RuleConditionType.MERCHANT_EQUALS, 'Shop') });
    rule.clearDomainEvents();
    ruleRepo.findById.mockResolvedValue(rule); ruleRepo.findByWorkspaceId.mockResolvedValue(page([rule])); ruleRepo.findActiveByWorkspaceId.mockResolvedValue(page([rule]));
    const ruleService = new CategoryRuleService(ruleRepo, access, { ensureCategory: vi.fn() });
    rules.getRuleByIdHandler.handle.mockImplementation(query => new GetRuleByIdHandler(ruleService).handle(query));
    rules.getRulesByWorkspaceHandler.handle.mockImplementation(query => new GetRulesByWorkspaceHandler(ruleService).handle(query));
    rules.getActiveRulesByWorkspaceHandler.handle.mockImplementation(query => new GetActiveRulesByWorkspaceHandler(ruleService).handle(query));
    rules.getExecutionsByRuleHandler.handle.mockImplementation(query => new GetExecutionsByRuleHandler(executionReads, access).handle(query));
    suggestions.getSuggestionByIdHandler.handle.mockImplementation(query => new GetSuggestionByIdHandler(suggestionReads, access).handle(query));
    suggestions.getSuggestionsByExpenseHandler.handle.mockImplementation(query => new GetSuggestionsByExpenseHandler(suggestionReads, access).handle(query));
    suggestions.getSuggestionsByWorkspaceHandler.handle.mockImplementation(query => new GetSuggestionsByWorkspaceHandler(suggestionReads, access).handle(query));
    suggestions.getPendingSuggestionsByWorkspaceHandler.handle.mockImplementation(query => new GetPendingSuggestionsByWorkspaceHandler(suggestionReads, access).handle(query));
    executions.getExecutionsByExpenseHandler.handle.mockImplementation(query => new GetExecutionsByExpenseHandler(executionReads, access).handle(query));
    executions.getExecutionsByWorkspaceHandler.handle.mockImplementation(query => new GetExecutionsByWorkspaceHandler(executionReads, access).handle(query));
    suggestionReads.getSuggestionById.mockResolvedValue(createMockSuggestion());
    suggestionReads.getSuggestionsByExpenseId.mockResolvedValue(page([createMockSuggestion()]));
    suggestionReads.getSuggestionsByWorkspaceId.mockResolvedValue(page([createMockSuggestion()]));
    suggestionReads.getPendingSuggestionsByWorkspaceId.mockResolvedValue(page([createMockSuggestion()]));
    for (const read of Object.values(executionReads)) read.mockResolvedValue(page([createMockExecution()]));
    app = await setupTestApp(rules, suggestions, executions);
  });
  afterEach(async () => { await app.close(); });
  const endpoints = [
    { path: `rules/${mockRuleId}`, read: ruleRepo.findById },
    { path: 'rules?limit=10&offset=50', read: ruleRepo.findByWorkspaceId },
    { path: 'rules?activeOnly=true&limit=10&offset=50', read: ruleRepo.findActiveByWorkspaceId },
    { path: `rules/${mockRuleId}/executions?limit=10&offset=50`, read: executionReads.getExecutionsByRuleId },
    { path: `suggestions/${mockSuggestionId}`, read: suggestionReads.getSuggestionById },
    { path: `suggestions/expense/${mockExpenseId}?limit=10&offset=50`, read: suggestionReads.getSuggestionsByExpenseId },
    { path: 'suggestions?limit=10&offset=50', read: suggestionReads.getSuggestionsByWorkspaceId },
    { path: 'suggestions?pendingOnly=true&limit=10&offset=50', read: suggestionReads.getPendingSuggestionsByWorkspaceId },
    { path: `executions/expense/${mockExpenseId}?limit=10&offset=50`, read: executionReads.getExecutionsByExpenseId },
    { path: 'executions?limit=10&offset=50', read: executionReads.getExecutionsByWorkspaceId },
  ];
  it.each(endpoints)('$path denies non-members before reading', async endpoint => {
    access.isMember.mockResolvedValue(false);
    const response = await app.inject({ method: 'GET', url: `/workspaces/${mockWorkspaceId}/${endpoint.path}` });
    expect(response.statusCode).toBe(403); expect(endpoint.read).not.toHaveBeenCalled();
    expect(access.isMember).toHaveBeenCalledTimes(1);
  });
  it.each(endpoints)('$path propagates unavailable membership verification', async endpoint => {
    access.isMember.mockRejectedValue(Object.assign(new Error('Identity unavailable'), { statusCode: 503 }));
    const response = await app.inject({ method: 'GET', url: `/workspaces/${mockWorkspaceId}/${endpoint.path}` });
    expect(response.statusCode).toBe(503); expect(endpoint.read).not.toHaveBeenCalled();
  });
  it.each(endpoints)('$path checks the authenticated actor exactly once and never writes', async endpoint => {
    access.isMember.mockResolvedValue(true);
    const response = await app.inject({ method: 'GET', url: `/workspaces/${mockWorkspaceId}/${endpoint.path}` });
    expect(response.statusCode).toBe(200); expect(endpoint.read).toHaveBeenCalledTimes(1);
    expect(access.isMember).toHaveBeenCalledTimes(1);
    expect(access.isMember).toHaveBeenCalledWith(UserId.fromString(mockUserId), WorkspaceId.fromString(mockWorkspaceId));
    expect(access.isAdminOrOwner).not.toHaveBeenCalled(); expect(ruleRepo.save).not.toHaveBeenCalled(); expect(ruleRepo.delete).not.toHaveBeenCalled();
  });
  it.each(['suggestions', 'executions'])('%s expense history forwards pagination and returns its metadata', async kind => {
    access.isMember.mockResolvedValue(true);
    const response = await app.inject({ method: 'GET', url: `/workspaces/${mockWorkspaceId}/${kind}/expense/${mockExpenseId}?limit=10&offset=50` });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.items).toHaveLength(1);
    expect(body.data.pagination).toEqual({ total: 75, limit: 10, offset: 50, hasMore: true });
    const read = kind === 'suggestions' ? suggestionReads.getSuggestionsByExpenseId : executionReads.getExecutionsByExpenseId;
    expect(read).toHaveBeenCalledWith(expect.anything(), WorkspaceId.fromString(mockWorkspaceId), { limit: 10, offset: 50 });
  });
  it.each(['suggestions', 'executions'])('%s expense history rejects overflowing offset before authorization', async kind => {
    const response = await app.inject({ method: 'GET', url: '/workspaces/' + mockWorkspaceId + '/' + kind + '/expense/' + mockExpenseId + '?offset=2147483648' });
    expect(response.statusCode).toBe(400); expect(access.isMember).not.toHaveBeenCalled();
  });
  it.each(['suggestions', 'executions'])('%s expense history rejects invalid pagination before authorization', async kind => {
    const response = await app.inject({ method: 'GET', url: `/workspaces/${mockWorkspaceId}/${kind}/expense/${mockExpenseId}?limit=101` });
    expect(response.statusCode).toBe(400); expect(access.isMember).not.toHaveBeenCalled();
  });
});
