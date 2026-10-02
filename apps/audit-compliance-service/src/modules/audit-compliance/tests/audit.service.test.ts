import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '../application/services/audit.service';
import { IAuditLogRepository } from '../domain/repositories/audit-log.repository';
import { AuditRetentionViolationError } from '../domain/errors/audit.errors';
import { AuditLog } from '../domain/entities/audit-log.entity';
import { AuditLogId } from '../domain/value-objects/audit-log-id.vo';
import { AuditAction } from '../domain/value-objects/audit-action.vo';
import { AuditResource } from '../domain/value-objects/audit-resource.vo';

// Helper to create mock AuditLog
function createMockAuditLog(
  id: string = '123e4567-e89b-12d3-a456-426614174010',
  workspaceId: string = '123e4567-e89b-12d3-a456-426614174000'
): AuditLog {
  return AuditLog.fromPersistence({
    id: AuditLogId.fromString(id),
    workspaceId,
    userId: '123e4567-e89b-12d3-a456-426614174001',
    action: AuditAction.create('EXPENSE_CREATED'),
    resource: AuditResource.create('EXPENSE', '123e4567-e89b-12d3-a456-426614174021'),
    details: { amount: 100 },
    metadata: {},
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    createdAt: new Date(),
  });
}

describe('AuditService', () => {
  let service: AuditService;
  let mockRepo: IAuditLogRepository;

  beforeEach(() => {
    mockRepo = {
      save: vi.fn(),
      saveIfAbsent: vi.fn(),
      saveMany: vi.fn(),
      findById: vi.fn(),
      findByWorkspace: vi.fn(),
      findByFilter: vi.fn(),
      findByEntityId: vi.fn(),
      countByWorkspace: vi.fn(),
      countByAction: vi.fn(),
      getActionSummary: vi.fn(),
      deleteOlderThan: vi.fn(),
    } as unknown as IAuditLogRepository;
    service = new AuditService(mockRepo);
  });

  describe('createAuditLog', () => {
    it('should create an audit log entry', async () => {
      const data = {
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        action: 'EXPENSE_CREATED',
        entityType: 'EXPENSE',
        entityId: '123e4567-e89b-12d3-a456-426614174021',
        details: { amount: 100 },
      };

      const result = await service.createAuditLog(data);

      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result.action).toBe('EXPENSE_CREATED');
      expect(result.metadata).toEqual({ source: 'manual-api' });
    });

    it('should pass ipAddress and userAgent when provided', async () => {
      const data = {
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        userId: null,
        action: 'EXPENSE_CREATED',
        entityType: 'EXPENSE',
        entityId: '123e4567-e89b-12d3-a456-426614174021',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const result = await service.createAuditLog(data);

      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.userAgent).toBe('Mozilla/5.0');
    });

    it('keeps caller metadata separate from server-owned provenance', async () => {
      const submittedMetadata = {
        source: 'outbox-event',
        eventId: '123e4567-e89b-12d3-a456-426614174099',
        version: '1.0.0',
      };
      const result = await service.createAuditLog({
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        action: 'EXPENSE_CREATED',
        entityType: 'EXPENSE',
        entityId: '123e4567-e89b-12d3-a456-426614174021',
        metadata: submittedMetadata,
      });

      expect(result.metadata).toEqual({
        source: 'manual-api',
        submittedMetadata,
      });
      expect(vi.mocked(mockRepo.save).mock.calls[0][0].metadata).toEqual(result.metadata);
      expect(submittedMetadata.source).toBe('outbox-event');
    });

    it('should throw when repository fails', async () => {
      (mockRepo.save as any).mockRejectedValue(new Error('DB Error'));

      await expect(
        service.createAuditLog({
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          userId: null,
          action: 'EXPENSE_CREATED',
          entityType: 'EXPENSE',
          entityId: '123e4567-e89b-12d3-a456-426614174021',
        })
      ).rejects.toThrow('DB Error');
    });
  });

  describe('recordExternalEvent', () => {
    const event = {
      eventId: '123e4567-e89b-12d3-a456-426614174010',
      eventType: 'expense.submitted',
      aggregateId: '123e4567-e89b-12d3-a456-426614174011',
      aggregateType: 'Expense',
      payload: {
        workspaceId: '123e4567-e89b-12d3-a456-426614174012',
        submittedBy: '123e4567-e89b-12d3-a456-426614174013',
        triggeredBy: '123e4567-e89b-12d3-a456-426614174014',
      },
      occurredAt: new Date('2026-01-01T12:00:00.000Z'),
    };

    it('uses the event ID, timestamp and acting user while preserving the payload', async () => {
      vi.mocked(mockRepo.saveIfAbsent).mockResolvedValue(true);
      expect(await service.recordExternalEvent(event)).toEqual({ auditLogId: event.eventId, duplicate: false });
      const saved = vi.mocked(mockRepo.saveIfAbsent).mock.calls[0][0];
      expect(saved.id.getValue()).toBe(event.eventId);
      expect(saved.createdAt.toISOString()).toBe(event.occurredAt.toISOString());
      expect(saved.workspaceId).toBe(event.payload.workspaceId);
      expect(saved.userId).toBe(event.payload.submittedBy);
      expect(saved.resource.entityId).toBe(event.aggregateId);
      expect(saved.details).toEqual(event.payload);
      expect(saved.metadata).toEqual({
        source: 'outbox-event',
        eventId: event.eventId,
        eventTimestamp: event.occurredAt.toISOString(),
      });
    });

    it('reports duplicate delivery without changing the event identity', async () => {
      vi.mocked(mockRepo.saveIfAbsent).mockResolvedValue(false);
      expect(await service.recordExternalEvent(event)).toEqual({ auditLogId: event.eventId, duplicate: true });
    });

    it('rejects invalid workspace and actor IDs before writing', async () => {
      await expect(service.recordExternalEvent({ ...event, payload: { workspaceId: 'invalid' } })).rejects.toThrow();
      await expect(service.recordExternalEvent({ ...event, payload: { ...event.payload, submittedBy: 'invalid' } })).rejects.toThrow();
      expect(mockRepo.saveIfAbsent).not.toHaveBeenCalled();
    });
  });

  describe('purgeOldLogs', () => {
    it('should purge old audit logs and return count', async () => {
      (mockRepo.deleteOlderThan as any).mockResolvedValue(50);

      const result = await service.purgeOldLogs(
        '123e4567-e89b-12d3-a456-426614174000',
        30,
        '123e4567-e89b-12d3-a456-426614174001'
      );

      expect(result).toBe(50);
      expect(mockRepo.deleteOlderThan).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        expect.any(Date),
        '123e4567-e89b-12d3-a456-426614174001',
        30
      );
    });

    it('should throw AuditRetentionViolationError when olderThanDays < 30', async () => {
      await expect(
        service.purgeOldLogs('123e4567-e89b-12d3-a456-426614174000', 29, '123e4567-e89b-12d3-a456-426614174001')
      ).rejects.toThrow(AuditRetentionViolationError);
      expect(mockRepo.deleteOlderThan).not.toHaveBeenCalled();
    });

    it('should throw error when repository fails', async () => {
      (mockRepo.deleteOlderThan as any).mockRejectedValue(
        new Error('DB Error')
      );

      await expect(
        service.purgeOldLogs('123e4567-e89b-12d3-a456-426614174000', 30, '123e4567-e89b-12d3-a456-426614174001')
      ).rejects.toThrow('DB Error');
    });
  });

  describe('read paths', () => {
    it('scopes a single-record lookup in the repository and hides a foreign-workspace row', async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(createMockAuditLog());
      const id = '123e4567-e89b-12d3-a456-426614174010';
      const workspaceId = '123e4567-e89b-12d3-a456-426614174099';
      await expect(service.getAuditLog(id, workspaceId)).rejects.toThrow();
      expect(mockRepo.findById).toHaveBeenCalledWith(expect.any(AuditLogId), workspaceId);
    });

    it('sets the summary total from the same period-scoped breakdown', async () => {
      vi.mocked(mockRepo.getActionSummary).mockResolvedValue([
        { action: 'expense.created', count: 2 },
        { action: 'expense.submitted', count: 3 },
      ]);
      const start = new Date('2026-01-01T00:00:00Z');
      const end = new Date('2026-01-02T00:00:00Z');
      const result = await service.getAuditSummary('123e4567-e89b-12d3-a456-426614174000', start, end);
      expect(result.totalLogs).toBe(5);
      expect(mockRepo.countByWorkspace).not.toHaveBeenCalled();
      expect(mockRepo.getActionSummary).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', start, end);
    });

    it('rejects reversed dates and invalid pagination before repository access', async () => {
      const start = new Date('2026-02-01T00:00:00Z');
      const end = new Date('2026-01-01T00:00:00Z');
      await expect(service.getAuditSummary('123e4567-e89b-12d3-a456-426614174000', start, end)).rejects.toThrow();
      await expect(service.listAuditLogs('123e4567-e89b-12d3-a456-426614174000', { startDate: start, endDate: end })).rejects.toThrow();
      await expect(service.listAuditLogs('123e4567-e89b-12d3-a456-426614174000', {}, 1.5, 0)).rejects.toThrow();
      await expect(service.getEntityAuditHistory('123e4567-e89b-12d3-a456-426614174000', 'Expense', '123e4567-e89b-12d3-a456-426614174011', { limit: 1, offset: 2147483648 })).rejects.toThrow();
      expect(mockRepo.getActionSummary).not.toHaveBeenCalled();
      expect(mockRepo.findByFilter).not.toHaveBeenCalled();
      expect(mockRepo.findByEntityId).not.toHaveBeenCalled();
    });
  });
});
