import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditService } from "../application/services/audit.service";
import { DomainEvent } from "../../../apps/api/src/shared/domain/events";
import { AuditLogRepository } from "../domain/repositories/audit-log.repository";
import { AuditLog } from "../domain/entities/audit-log.entity";
import { AuditLogId } from "../domain/value-objects/audit-log-id.vo";
import { AuditAction } from "../domain/value-objects/audit-action.vo";
import { AuditResource } from "../domain/value-objects/audit-resource.vo";

// Mock Event
class MockEvent extends DomainEvent {
  constructor(public readonly id: string) {
    super(id, "MockEntity");
  }
  get eventType() {
    return "mock.event";
  }
  getPayload() {
    return {
      workspaceId: "123e4567-e89b-12d3-a456-426614174000",
      userId: "123e4567-e89b-12d3-a456-426614174001",
    };
  }
  public getOccurredAt() {
    return this.occurredAt;
  }
}

// Helper to create mock AuditLog
function createMockAuditLog(
  id: string = "123e4567-e89b-12d3-a456-426614174010",
  workspaceId: string = "123e4567-e89b-12d3-a456-426614174000",
): AuditLog {
  return AuditLog.fromPersistence({
    id: AuditLogId.fromString(id),
    workspaceId,
    userId: "123e4567-e89b-12d3-a456-426614174001",
    action: AuditAction.create("EXPENSE_CREATED"),
    resource: AuditResource.create("EXPENSE", "expense-123"),
    details: { amount: 100 },
    metadata: {},
    ipAddress: "127.0.0.1",
    userAgent: "test-agent",
    createdAt: new Date(),
  });
}

describe("AuditService", () => {
  let service: AuditService;
  let mockRepo: AuditLogRepository;

  beforeEach(() => {
    mockRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findByWorkspace: vi.fn(),
      findByFilter: vi.fn(),
      findByEntityId: vi.fn(),
      countByWorkspace: vi.fn(),
      countByAction: vi.fn(),
      getActionSummary: vi.fn(),
    } as unknown as AuditLogRepository;
    service = new AuditService(mockRepo);
  });

  describe("log", () => {
    it("should create and save an audit log from a domain event", async () => {
      const event = new MockEvent("123e4567-e89b-12d3-a456-426614174002");

      await service.log(event);

      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      const savedLog = (mockRepo.save as any).mock.calls[0][0] as AuditLog;

      expect(savedLog).toBeInstanceOf(AuditLog);
      expect(savedLog.action.getValue()).toBe("mock.event");
      expect(savedLog.resource.entityId).toBe(
        "123e4567-e89b-12d3-a456-426614174002",
      );
      expect(savedLog.workspaceId).toBe("123e4567-e89b-12d3-a456-426614174000");
    });

    it("should handle errors gracefully", async () => {
      const event = new MockEvent("123e4567-e89b-12d3-a456-426614174002");
      (mockRepo.save as any).mockRejectedValue(new Error("DB Error"));

      // Should not throw
      await expect(service.log(event)).resolves.not.toThrow();
    });
  });

  describe("createAuditLog", () => {
    it("should create an audit log entry", async () => {
      const data = {
        workspaceId: "123e4567-e89b-12d3-a456-426614174000",
        userId: "123e4567-e89b-12d3-a456-426614174001",
        action: "EXPENSE_CREATED",
        entityType: "EXPENSE",
        entityId: "expense-123",
        details: { amount: 100 },
      };

      const result = await service.createAuditLog(data);

      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(AuditLog);
      expect(result.action.getValue()).toBe("EXPENSE_CREATED");
    });
  });

  describe("getAuditLogById", () => {
    it("should return audit log when found", async () => {
      const mockLog = createMockAuditLog();
      (mockRepo.findById as any).mockResolvedValue(mockLog);

      const result = await service.getAuditLogById(
        "123e4567-e89b-12d3-a456-426614174000",
        "123e4567-e89b-12d3-a456-426614174010",
      );

      expect(result).toBe(mockLog);
    });

    it("should return null when audit log belongs to different workspace", async () => {
      const mockLog = createMockAuditLog(
        "123e4567-e89b-12d3-a456-426614174010",
        "different-workspace",
      );
      (mockRepo.findById as any).mockResolvedValue(mockLog);

      const result = await service.getAuditLogById(
        "123e4567-e89b-12d3-a456-426614174000",
        "123e4567-e89b-12d3-a456-426614174010",
      );

      expect(result).toBeNull();
    });

    it("should return null when audit log not found", async () => {
      (mockRepo.findById as any).mockResolvedValue(null);

      const result = await service.getAuditLogById(
        "123e4567-e89b-12d3-a456-426614174000",
        "99999999-9999-4999-a999-999999999999",
      );

      expect(result).toBeNull();
    });
  });

  describe("listAuditLogs", () => {
    it("should list audit logs with filters", async () => {
      const mockResult = {
        items: [createMockAuditLog()],
        total: 1,
        limit: 50,
        offset: 0,
      };
      (mockRepo.findByFilter as any).mockResolvedValue(mockResult);

      const result = await service.listAuditLogs(
        "123e4567-e89b-12d3-a456-426614174000",
        { action: "EXPENSE_CREATED" },
        50,
        0,
      );

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockRepo.findByFilter).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "123e4567-e89b-12d3-a456-426614174000",
          action: "EXPENSE_CREATED",
        }),
      );
    });
  });

  describe("getEntityAuditHistory", () => {
    it("should return audit history for an entity", async () => {
      const mockLogs = [createMockAuditLog()];
      (mockRepo.findByEntityId as any).mockResolvedValue(mockLogs);

      const result = await service.getEntityAuditHistory(
        "123e4567-e89b-12d3-a456-426614174000",
        "EXPENSE",
        "expense-123",
      );

      expect(result).toHaveLength(1);
      expect(mockRepo.findByEntityId).toHaveBeenCalledWith(
        "123e4567-e89b-12d3-a456-426614174000",
        "EXPENSE",
        "expense-123",
        undefined,
      );
    });
  });

  describe("getAuditSummary", () => {
    it("should return audit summary statistics", async () => {
      (mockRepo.countByWorkspace as any).mockResolvedValue(100);
      (mockRepo.getActionSummary as any).mockResolvedValue([
        { action: "EXPENSE_CREATED", count: 50 },
        { action: "EXPENSE_UPDATED", count: 30 },
      ]);

      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");

      const result = await service.getAuditSummary(
        "123e4567-e89b-12d3-a456-426614174000",
        startDate,
        endDate,
      );

      expect(result.totalLogs).toBe(100);
      expect(result.actionBreakdown).toHaveLength(2);
      expect(result.period.startDate).toEqual(startDate);
      expect(result.period.endDate).toEqual(endDate);
    });
  });
});
