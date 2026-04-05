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
  return AuditLog.reconstitute({
    id: AuditLogId.fromString(id),
    workspaceId,
    userId: '123e4567-e89b-12d3-a456-426614174001',
    action: AuditAction.create('EXPENSE_CREATED'),
    resource: AuditResource.create('EXPENSE', 'expense-123'),
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
        entityId: 'expense-123',
        details: { amount: 100 },
      };

      const result = await service.createAuditLog(data);

      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(AuditLog);
      expect(result.action.getValue()).toBe('EXPENSE_CREATED');
    });

    it('should pass ipAddress and userAgent when provided', async () => {
      const data = {
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        userId: null,
        action: 'EXPENSE_CREATED',
        entityType: 'EXPENSE',
        entityId: 'expense-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const result = await service.createAuditLog(data);

      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.userAgent).toBe('Mozilla/5.0');
    });

    it('should throw when repository fails', async () => {
      (mockRepo.save as any).mockRejectedValue(new Error('DB Error'));

      await expect(
        service.createAuditLog({
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          userId: null,
          action: 'EXPENSE_CREATED',
          entityType: 'EXPENSE',
          entityId: 'expense-123',
        })
      ).rejects.toThrow('DB Error');
    });
  });

  describe('purgeOldLogs', () => {
    it('should purge old audit logs and return count', async () => {
      (mockRepo.deleteOlderThan as any).mockResolvedValue(50);

      const result = await service.purgeOldLogs(
        '123e4567-e89b-12d3-a456-426614174000',
        30
      );

      expect(result).toBe(50);
      expect(mockRepo.deleteOlderThan).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        expect.any(Date)
      );
    });

    it('should throw AuditRetentionViolationError when olderThanDays < 30', async () => {
      await expect(
        service.purgeOldLogs('123e4567-e89b-12d3-a456-426614174000', 29)
      ).rejects.toThrow(AuditRetentionViolationError);
      expect(mockRepo.deleteOlderThan).not.toHaveBeenCalled();
    });

    it('should throw error when repository fails', async () => {
      (mockRepo.deleteOlderThan as any).mockRejectedValue(
        new Error('DB Error')
      );

      await expect(
        service.purgeOldLogs('123e4567-e89b-12d3-a456-426614174000', 30)
      ).rejects.toThrow('DB Error');
    });
  });
});
