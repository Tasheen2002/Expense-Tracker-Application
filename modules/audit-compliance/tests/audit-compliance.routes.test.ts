import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { AuditLogController } from "../infrastructure/http/controllers/audit-log.controller";
import { auditLogRoutes } from "../infrastructure/http/routes/audit-log.routes";
import { AuditService } from "../application/services/audit.service";
import { AuditLog } from "../domain/entities/audit-log.entity";
import { AuditLogId } from "../domain/value-objects/audit-log-id.vo";
import { AuditAction } from "../domain/value-objects/audit-action.vo";
import { AuditResource } from "../domain/value-objects/audit-resource.vo";

// Mock data
const mockWorkspaceId = "123e4567-e89b-12d3-a456-426614174000";
const mockUserId = "123e4567-e89b-12d3-a456-426614174001";
const mockAuditLogId = "123e4567-e89b-12d3-a456-426614174010";

// Helper to create mock AuditLog
function createMockAuditLog(
  id: string = mockAuditLogId,
  action: string = "EXPENSE_CREATED",
  entityType: string = "EXPENSE",
  entityId: string = "expense-123",
): AuditLog {
  return AuditLog.fromPersistence({
    id: AuditLogId.fromString(id),
    workspaceId: mockWorkspaceId,
    userId: mockUserId,
    action: AuditAction.create(action),
    resource: AuditResource.create(entityType, entityId),
    details: { amount: 100, currency: "USD" },
    metadata: { source: "api" },
    ipAddress: "127.0.0.1",
    userAgent: "test-agent",
    createdAt: new Date("2024-01-15T10:30:00Z"),
  });
}

// Create mock audit service
function createMockAuditService() {
  return {
    log: vi.fn(),
    createAuditLog: vi.fn(),
    getAuditLogById: vi.fn(),
    listAuditLogs: vi.fn(),
    getEntityAuditHistory: vi.fn(),
    getAuditSummary: vi.fn(),
  } as unknown as AuditService;
}

// Setup test app with authentication
async function setupTestApp(
  auditService: AuditService,
): Promise<FastifyInstance> {
  const app = Fastify();

  // Mock authenticate decorator
  app.decorate("authenticate", async (request: any) => {
    request.user = { userId: mockUserId, email: "test@example.com" };
  });

  // Register routes with mock workspace context
  await app.register(
    async (instance) => {
      // Set up user context (simulating authentication)
      instance.addHook("preHandler", async (request: any) => {
        request.user = { userId: mockUserId, email: "test@example.com" };
        request.workspace = { workspaceId: mockWorkspaceId, role: "admin" };
      });

      await auditLogRoutes(instance, { auditService });
    },
    { prefix: "/api/v1/workspaces/:workspaceId/audit-logs" },
  );

  return app;
}

describe("Audit Compliance Endpoints", () => {
  let app: FastifyInstance;
  let mockService: ReturnType<typeof createMockAuditService>;

  beforeEach(async () => {
    mockService = createMockAuditService();
    app = await setupTestApp(mockService as unknown as AuditService);
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  describe("GET /api/v1/workspaces/:workspaceId/audit-logs", () => {
    it("should list audit logs successfully", async () => {
      const mockLogs = [
        createMockAuditLog(mockAuditLogId, "EXPENSE_CREATED"),
        createMockAuditLog(
          "123e4567-e89b-12d3-a456-426614174011",
          "EXPENSE_UPDATED",
        ),
      ];
      (mockService.listAuditLogs as any).mockResolvedValue({
        items: mockLogs,
        total: 2,
        limit: 50,
        offset: 0,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body.data.items)).toBe(true);
      expect(body.data.items).toHaveLength(2);
      expect(body.data.pagination.total).toBe(2);
      expect(body.data.pagination.limit).toBe(50);
      expect(body.data.pagination.offset).toBe(0);
    });

    it("should list audit logs with filters", async () => {
      const mockLogs = [createMockAuditLog()];
      (mockService.listAuditLogs as any).mockResolvedValue({
        items: mockLogs,
        total: 1,
        limit: 10,
        offset: 0,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs?action=EXPENSE_CREATED&entityType=EXPENSE&limit=10`,
      });

      expect(response.statusCode).toBe(200);
      expect(mockService.listAuditLogs).toHaveBeenCalledWith(
        mockWorkspaceId,
        expect.objectContaining({
          action: "EXPENSE_CREATED",
          entityType: "EXPENSE",
        }),
        10,
        0,
      );
    });

    it("should list audit logs with date range filter", async () => {
      (mockService.listAuditLogs as any).mockResolvedValue({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      const startDate = "2024-01-01T00:00:00Z";
      const endDate = "2024-12-31T23:59:59Z";

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
      });

      expect(response.statusCode).toBe(200);
      expect(mockService.listAuditLogs).toHaveBeenCalled();
    });

    it("should handle pagination", async () => {
      (mockService.listAuditLogs as any).mockResolvedValue({
        items: [],
        total: 100,
        limit: 20,
        offset: 40,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs?limit=20&offset=40`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.pagination.limit).toBe(20);
      expect(body.data.pagination.offset).toBe(40);
    });

    it("should return empty list when no audit logs found", async () => {
      (mockService.listAuditLogs as any).mockResolvedValue({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body.data.items)).toBe(true);
      expect(body.data.items).toHaveLength(0);
      expect(body.data.pagination.total).toBe(0);
    });
  });

  describe("GET /api/v1/workspaces/:workspaceId/audit-logs/:auditLogId", () => {
    it("should get a specific audit log", async () => {
      const mockLog = createMockAuditLog();
      (mockService.getAuditLogById as any).mockResolvedValue(mockLog);

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs/${mockAuditLogId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(mockAuditLogId);
      expect(body.action).toBe("EXPENSE_CREATED");
      expect(body.entityType).toBe("EXPENSE");
    });

    it("should return 404 when audit log not found", async () => {
      (mockService.getAuditLogById as any).mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs/${mockAuditLogId}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("AUDIT_LOG_NOT_FOUND");
    });

    it("should return 400 for invalid audit log ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs/invalid-uuid`,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/v1/workspaces/:workspaceId/audit-logs/summary", () => {
    it("should get audit summary", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");

      (mockService.getAuditSummary as any).mockResolvedValue({
        totalLogs: 150,
        actionBreakdown: [
          { action: "EXPENSE_CREATED", count: 80 },
          { action: "EXPENSE_UPDATED", count: 40 },
          { action: "RECEIPT_UPLOADED", count: 30 },
        ],
        period: { startDate, endDate },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs/summary?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.totalLogs).toBe(150);
      expect(body.actionBreakdown).toHaveLength(3);
    });

    it("should return 400 when startDate/endDate missing", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs/summary`,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when only startDate provided", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs/summary?startDate=2024-01-01T00:00:00Z`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /api/v1/workspaces/:workspaceId/audit-logs/entity-history", () => {
    it("should get entity audit history", async () => {
      const mockLogs = [
        createMockAuditLog(
          mockAuditLogId,
          "EXPENSE_CREATED",
          "EXPENSE",
          "expense-123",
        ),
        createMockAuditLog(
          "123e4567-e89b-12d3-a456-426614174012",
          "EXPENSE_UPDATED",
          "EXPENSE",
          "expense-123",
        ),
      ];
      (mockService.getEntityAuditHistory as any).mockResolvedValue(mockLogs);

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs/entity-history?entityType=EXPENSE&entityId=expense-123`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it("should return 400 when entityType missing", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs/entity-history?entityId=expense-123`,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when entityId missing", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs/entity-history?entityType=EXPENSE`,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return empty list when no history found", async () => {
      (mockService.getEntityAuditHistory as any).mockResolvedValue([]);

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs/entity-history?entityType=EXPENSE&entityId=non-existent`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toHaveLength(0);
    });
  });

  describe("POST /api/v1/workspaces/:workspaceId/audit-logs", () => {
    it("should create an audit log", async () => {
      const mockLog = createMockAuditLog();
      (mockService.createAuditLog as any).mockResolvedValue(mockLog);

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs`,
        payload: {
          action: "EXPENSE_CREATED",
          entityType: "EXPENSE",
          entityId: "expense-123",
          details: { amount: 100 },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(mockAuditLogId);
      expect(body.action).toBe("EXPENSE_CREATED");
    });

    it("should return 400 when action missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs`,
        payload: {
          entityType: "EXPENSE",
          entityId: "expense-123",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when entityType missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs`,
        payload: {
          action: "EXPENSE_CREATED",
          entityId: "expense-123",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when entityId missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs`,
        payload: {
          action: "EXPENSE_CREATED",
          entityType: "EXPENSE",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should create audit log with optional metadata", async () => {
      const mockLog = createMockAuditLog();
      (mockService.createAuditLog as any).mockResolvedValue(mockLog);

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs`,
        payload: {
          action: "EXPENSE_CREATED",
          entityType: "EXPENSE",
          entityId: "expense-123",
          details: { amount: 100, currency: "USD" },
          metadata: { source: "mobile_app", version: "1.0.0" },
        },
      });

      expect(response.statusCode).toBe(201);
      expect(mockService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          details: { amount: 100, currency: "USD" },
          metadata: { source: "mobile_app", version: "1.0.0" },
        }),
      );
    });
  });

  describe("Filter combinations", () => {
    it("should filter by user ID", async () => {
      (mockService.listAuditLogs as any).mockResolvedValue({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs?userId=${mockUserId}`,
      });

      expect(response.statusCode).toBe(200);
      expect(mockService.listAuditLogs).toHaveBeenCalledWith(
        mockWorkspaceId,
        expect.objectContaining({ userId: mockUserId }),
        50,
        0,
      );
    });

    it("should filter by entity ID", async () => {
      (mockService.listAuditLogs as any).mockResolvedValue({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs?entityId=expense-123`,
      });

      expect(response.statusCode).toBe(200);
      expect(mockService.listAuditLogs).toHaveBeenCalledWith(
        mockWorkspaceId,
        expect.objectContaining({ entityId: "expense-123" }),
        50,
        0,
      );
    });

    it("should combine multiple filters", async () => {
      (mockService.listAuditLogs as any).mockResolvedValue({
        items: [],
        total: 0,
        limit: 25,
        offset: 10,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs?action=EXPENSE_CREATED&entityType=EXPENSE&userId=${mockUserId}&limit=25&offset=10`,
      });

      expect(response.statusCode).toBe(200);
      expect(mockService.listAuditLogs).toHaveBeenCalledWith(
        mockWorkspaceId,
        expect.objectContaining({
          action: "EXPENSE_CREATED",
          entityType: "EXPENSE",
          userId: mockUserId,
        }),
        25,
        10,
      );
    });
  });

  describe("Response format validation", () => {
    it("should return properly formatted audit log response", async () => {
      const mockLog = createMockAuditLog();
      (mockService.getAuditLogById as any).mockResolvedValue(mockLog);

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs/${mockAuditLogId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      // Verify response structure
      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("workspaceId");
      expect(body).toHaveProperty("userId");
      expect(body).toHaveProperty("action");
      expect(body).toHaveProperty("entityType");
      expect(body).toHaveProperty("entityId");
      expect(body).toHaveProperty("details");
      expect(body).toHaveProperty("metadata");
      expect(body).toHaveProperty("ipAddress");
      expect(body).toHaveProperty("userAgent");
      expect(body).toHaveProperty("createdAt");
    });

    it("should return properly formatted paginated response", async () => {
      const mockLogs = [createMockAuditLog()];
      (mockService.listAuditLogs as any).mockResolvedValue({
        items: mockLogs,
        total: 1,
        limit: 50,
        offset: 0,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      // Verify pagination structure
      expect(body.data).toHaveProperty("items");
      expect(body.data).toHaveProperty("pagination");
      expect(body.data.pagination).toHaveProperty("total");
      expect(body.data.pagination).toHaveProperty("limit");
      expect(body.data.pagination).toHaveProperty("offset");
      expect(Array.isArray(body.data.items)).toBe(true);
    });
  });

  describe("Audit action types coverage", () => {
    const actionTypes = [
      "USER_CREATED",
      "USER_UPDATED",
      "WORKSPACE_CREATED",
      "EXPENSE_CREATED",
      "EXPENSE_UPDATED",
      "EXPENSE_DELETED",
      "EXPENSE_SUBMITTED",
      "EXPENSE_APPROVED",
      "EXPENSE_REJECTED",
      "RECEIPT_UPLOADED",
      "RECEIPT_DELETED",
      "BUDGET_CREATED",
      "BUDGET_UPDATED",
      "CATEGORY_CREATED",
      "APPROVAL_WORKFLOW_TRIGGERED",
      "POLICY_VIOLATION_DETECTED",
    ];

    it.each(actionTypes)("should handle %s action type", async (actionType) => {
      const mockLog = createMockAuditLog(mockAuditLogId, actionType);
      (mockService.createAuditLog as any).mockResolvedValue(mockLog);

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs`,
        payload: {
          action: actionType,
          entityType: "EXPENSE",
          entityId: "expense-123",
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe("Entity types coverage", () => {
    const entityTypes = [
      "USER",
      "WORKSPACE",
      "EXPENSE",
      "RECEIPT",
      "BUDGET",
      "CATEGORY",
      "APPROVAL_WORKFLOW",
      "POLICY",
      "COST_ALLOCATION",
      "NOTIFICATION",
    ];

    it.each(entityTypes)("should handle %s entity type", async (entityType) => {
      const mockLog = createMockAuditLog(
        mockAuditLogId,
        "ENTITY_CREATED",
        entityType,
      );
      (mockService.createAuditLog as any).mockResolvedValue(mockLog);

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/workspaces/${mockWorkspaceId}/audit-logs`,
        payload: {
          action: "ENTITY_CREATED",
          entityType: entityType,
          entityId: "entity-123",
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });
});
