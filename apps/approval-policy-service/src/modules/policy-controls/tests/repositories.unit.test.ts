import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '../../../shared/infrastructure/persistence/prisma.client';
import { PrismaPolicyRepository } from '../infrastructure/persistence/policy.repository.impl';
import { PrismaViolationRepository } from '../infrastructure/persistence/violation.repository.impl';
import { PrismaExemptionRepository } from '../infrastructure/persistence/exemption.repository.impl';
import { ExpensePolicy } from '../domain/entities/expense-policy.entity';
import { PolicyViolation } from '../domain/entities/policy-violation.entity';
import { PolicyExemption } from '../domain/entities/policy-exemption.entity';
import { PolicyId, ViolationId } from '../domain/value-objects';
import { PolicyType, ViolationSeverity, ViolationStatus, ExemptionStatus } from '../domain/enums';
import {
  PolicyNameAlreadyExistsError,
  InvalidPolicyConfigurationError,
  PolicyEvaluationError,
  ExemptionAlreadyProcessedError,
  ViolationAlreadyResolvedError,
} from '../domain/errors/policy-controls.errors';
import { SYSTEM_ACTOR_ID } from '../domain/constants/policy-controls.constants';
import { WorkspaceId, UserId, ExpenseId } from '@core/domain/value-objects';
import { IEventBus } from '@core/domain/events/domain-event';
import { PolicyEvaluationService } from '../application/services/policy-evaluation.service';

describe('Policy Controls Repositories & Invariants Unit Tests', () => {
  let mockPrisma: any;
  let mockEventBus: IEventBus;

  const validWorkspaceId = '11111111-1111-4111-a111-111111111111';
  const validExpenseId = '33333333-3333-4333-a333-333333333333';
  const validUserId = '44444444-4444-4444-a444-444444444444';
  const validPolicyId = '55555555-5555-4555-a555-555555555555';

  beforeEach(() => {
    mockEventBus = {
      publish: vi.fn(),
      publishAll: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };

    mockPrisma = {
      expensePolicy: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn().mockResolvedValue({}),
        count: vi.fn(),
        delete: vi.fn().mockResolvedValue({}),
      },
      policyViolation: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn().mockResolvedValue({}),
        count: vi.fn(),
        groupBy: vi.fn(),
        delete: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      policyExemption: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        upsert: vi.fn().mockResolvedValue({}),
        count: vi.fn(),
        delete: vi.fn().mockResolvedValue({}),
      },
      outboxEvent: {
        create: vi.fn().mockResolvedValue({}),
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
      $queryRaw: vi.fn().mockResolvedValue([]),
      $executeRaw: vi.fn().mockResolvedValue(1),
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
    };
  });

  // ==========================================================================
  // 1. PrismaPolicyRepository
  // ==========================================================================
  describe('PrismaPolicyRepository', () => {
    let repo: PrismaPolicyRepository;

    beforeEach(() => {
      repo = new PrismaPolicyRepository(mockPrisma as unknown as PrismaClient, mockEventBus);
    });

    it('should save aggregate and outbox events in one transaction, then dispatch locally', async () => {
      const policy = ExpensePolicy.create({
        workspaceId: validWorkspaceId,
        name: 'Meal Limit',
        policyType: PolicyType.SPENDING_LIMIT,
        severity: ViolationSeverity.MEDIUM,
        configuration: { threshold: 50, currency: 'USD' },
        createdBy: validUserId,
      });

      expect(policy.domainEvents.length).toBeGreaterThan(0);

      await repo.save(policy);

      // Verify transaction was called
      expect(mockPrisma.$transaction).toHaveBeenCalled();

      // Verify aggregate upsert happened inside transaction
      expect(mockPrisma.expensePolicy.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: policy.id.getValue() },
          create: expect.objectContaining({
            id: policy.id.getValue(),
            workspaceId: validWorkspaceId,
            name: 'Meal Limit',
          }),
        })
      );

      // Verify outbox event was created inside transaction
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aggregateId: policy.id.getValue(),
            aggregateType: 'ExpensePolicy',
            eventType: 'policy.created',
            status: 'PENDING',
          }),
        })
      );

      // Verify events were dispatched locally after transaction commit
      expect(mockEventBus.publishAll).toHaveBeenCalled();
      expect(policy.domainEvents).toHaveLength(0);
    });

    it('should translate Prisma unique constraint violation (P2002) into PolicyNameAlreadyExistsError when target contains name', async () => {
      const policy = ExpensePolicy.create({
        workspaceId: validWorkspaceId,
        name: 'Travel Policy',
        policyType: PolicyType.SPENDING_LIMIT,
        severity: ViolationSeverity.HIGH,
        configuration: { threshold: 200, currency: 'USD' },
        createdBy: validUserId,
      });

      const p2002Error: any = new Error('Unique constraint failed on the fields: (`workspace_id`,`name`)');
      p2002Error.code = 'P2002';
      p2002Error.meta = { target: ['workspace_id', 'name'] };
      mockPrisma.expensePolicy.upsert.mockRejectedValue(p2002Error);

      await expect(repo.save(policy)).rejects.toThrow(PolicyNameAlreadyExistsError);
    });

    it('should NOT translate P2002 on unrelated constraints (e.g. outbox event) into PolicyNameAlreadyExistsError', async () => {
      const policy = ExpensePolicy.create({
        workspaceId: validWorkspaceId,
        name: 'Travel Policy',
        policyType: PolicyType.SPENDING_LIMIT,
        severity: ViolationSeverity.HIGH,
        configuration: { threshold: 200, currency: 'USD' },
        createdBy: validUserId,
      });

      const outboxError: any = new Error('Unique constraint failed on the fields: (`id`)');
      outboxError.code = 'P2002';
      outboxError.meta = { target: ['id'] };
      mockPrisma.expensePolicy.upsert.mockRejectedValue(outboxError);

      await expect(repo.save(policy)).rejects.toThrow(outboxError);
    });

    it('should normalize policy name with trim and use case-insensitive lookup in findByNameInWorkspace', async () => {
      mockPrisma.expensePolicy.findFirst.mockResolvedValue(null);

      await repo.findByNameInWorkspace(WorkspaceId.fromString(validWorkspaceId), '  Travel Policy  ');

      expect(mockPrisma.expensePolicy.findFirst).toHaveBeenCalledWith({
        where: {
          workspaceId: validWorkspaceId,
          name: { equals: 'Travel Policy', mode: 'insensitive' },
        },
      });
    });

    it('should enforce workspace scoping in findByWorkspace and order by priority DESC, createdAt DESC', async () => {
      mockPrisma.expensePolicy.findMany.mockResolvedValue([]);
      mockPrisma.expensePolicy.count.mockResolvedValue(0);

      await repo.findByWorkspace(WorkspaceId.fromString(validWorkspaceId), { limit: 10, offset: 0 });

      expect(mockPrisma.expensePolicy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: validWorkspaceId },
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
          take: 10,
          skip: 0,
        })
      );
    });

    it('should retrieve all active policies for workspace without pagination limit in findAllActiveByWorkspace', async () => {
      mockPrisma.expensePolicy.findMany.mockResolvedValue([]);

      const result = await repo.findAllActiveByWorkspace(WorkspaceId.fromString(validWorkspaceId));

      expect(result).toEqual([]);
      expect(mockPrisma.expensePolicy.findMany).toHaveBeenCalledWith({
        where: { workspaceId: validWorkspaceId, isActive: true },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });

  // ==========================================================================
  // 2. PrismaViolationRepository
  // ==========================================================================
  describe('PrismaViolationRepository', () => {
    let repo: PrismaViolationRepository;

    beforeEach(() => {
      repo = new PrismaViolationRepository(mockPrisma as unknown as PrismaClient, mockEventBus);
    });

    it('should save violation and outbox events in one transaction, then dispatch locally', async () => {
      const violation = PolicyViolation.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.HIGH,
        violationDetails: 'Exceeded $100 spending limit',
        expenseAmount: 150,
        currency: 'USD',
      });

      expect(violation.domainEvents.length).toBeGreaterThan(0);

      await repo.save(violation);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.policyViolation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: violation.id.getValue(),
            workspaceId: validWorkspaceId,
            expenseId: validExpenseId,
          }),
        })
      );
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aggregateId: violation.id.getValue(),
            aggregateType: 'PolicyViolation',
            eventType: 'violation.detected',
          }),
        })
      );
      expect(mockEventBus.publishAll).toHaveBeenCalled();
      expect(violation.domainEvents).toHaveLength(0);
    });

    it('[P1] findByExpense must enforce workspace isolation by scoping to BOTH workspaceId and expenseId', async () => {
      mockPrisma.policyViolation.findMany.mockResolvedValue([]);

      await repo.findByExpense(
        WorkspaceId.fromString(validWorkspaceId),
        ExpenseId.fromString(validExpenseId)
      );

      expect(mockPrisma.policyViolation.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: validWorkspaceId,
          expenseId: validExpenseId,
        },
        orderBy: { detectedAt: 'desc' },
      });
    });

    it('[P1] deleteByExpense must enforce workspace isolation by scoping to BOTH workspaceId and expenseId', async () => {
      await repo.deleteByExpense(
        WorkspaceId.fromString(validWorkspaceId),
        ExpenseId.fromString(validExpenseId)
      );

      expect(mockPrisma.policyViolation.deleteMany).toHaveBeenCalledWith({
        where: {
          workspaceId: validWorkspaceId,
          expenseId: validExpenseId,
        },
      });
    });

    it('[P2] findByWorkspace must honor startDate, endDate, and entity filters', async () => {
      mockPrisma.policyViolation.findMany.mockResolvedValue([]);
      mockPrisma.policyViolation.count.mockResolvedValue(0);

      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      await repo.findByWorkspace(WorkspaceId.fromString(validWorkspaceId), {
        status: ViolationStatus.PENDING,
        severity: ViolationSeverity.CRITICAL,
        userId: validUserId,
        expenseId: validExpenseId,
        policyId: validPolicyId,
        startDate,
        endDate,
      });

      expect(mockPrisma.policyViolation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            workspaceId: validWorkspaceId,
            status: ViolationStatus.PENDING,
            severity: ViolationSeverity.CRITICAL,
            userId: validUserId,
            expenseId: validExpenseId,
            policyId: validPolicyId,
            detectedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        })
      );
    });

    it('[P2] countByWorkspace must honor all filters including startDate and endDate', async () => {
      mockPrisma.policyViolation.count.mockResolvedValue(5);

      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      const count = await repo.countByWorkspace(WorkspaceId.fromString(validWorkspaceId), {
        status: ViolationStatus.PENDING,
        severity: ViolationSeverity.HIGH,
        userId: validUserId,
        expenseId: validExpenseId,
        policyId: validPolicyId,
        startDate,
        endDate,
      });

      expect(count).toBe(5);
      expect(mockPrisma.policyViolation.count).toHaveBeenCalledWith({
        where: {
          workspaceId: validWorkspaceId,
          status: ViolationStatus.PENDING,
          severity: ViolationSeverity.HIGH,
          userId: validUserId,
          expenseId: validExpenseId,
          policyId: validPolicyId,
          detectedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
    });

    it('[P2] getStats must aggregate across all matching records rather than truncating on page limit', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      mockPrisma.policyViolation.count.mockResolvedValue(150);
      mockPrisma.policyViolation.groupBy
        .mockResolvedValueOnce([
          { status: ViolationStatus.PENDING, _count: { _all: 80 } },
          { status: ViolationStatus.RESOLVED, _count: { _all: 50 } },
          { status: ViolationStatus.EXEMPTED, _count: { _all: 20 } },
        ])
        .mockResolvedValueOnce([
          { severity: ViolationSeverity.HIGH, _count: { _all: 100 } },
          { severity: ViolationSeverity.CRITICAL, _count: { _all: 50 } },
        ]);

      const stats = await repo.getStats(WorkspaceId.fromString(validWorkspaceId), {
        startDate,
        endDate,
      });

      expect(stats.total).toBe(150);
      expect(stats.byStatus[ViolationStatus.PENDING]).toBe(80);
      expect(stats.byStatus[ViolationStatus.RESOLVED]).toBe(50);
      expect(stats.byStatus[ViolationStatus.EXEMPTED]).toBe(20);
      expect(stats.bySeverity[ViolationSeverity.HIGH]).toBe(100);
      expect(stats.bySeverity[ViolationSeverity.CRITICAL]).toBe(50);
      expect(stats.bySeverity[ViolationSeverity.LOW]).toBe(0);
    });

    it('should accurately preserve expenseAmount: 0 and map null currency to undefined in toDomain()', async () => {
      const mockViolationRow = {
        id: '77777777-7777-4777-a777-777777777777',
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        status: ViolationStatus.PENDING,
        severity: ViolationSeverity.LOW,
        violationDetails: 'Zero amount evaluation',
        expenseAmount: 0,
        currency: null,
        acknowledgedBy: null,
        acknowledgedAt: null,
        resolvedBy: null,
        resolvedAt: null,
        resolutionNote: null,
        overriddenBy: null,
        overrideReason: null,
        exemptionId: null,
        detectedAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.policyViolation.findUnique.mockResolvedValue(mockViolationRow);

      const violation = await repo.findById(ViolationId.fromString(mockViolationRow.id));
      expect(violation).not.toBeNull();
      expect(violation?.expenseAmount).toBe(0);
      expect(violation?.currency).toBeUndefined();
    });

    it('[P2] saveForExpense must transition stale PENDING violations to RESOLVED and emit outbox events rather than deleting them', async () => {
      const staleRow = {
        id: '88888888-8888-4888-a888-888888888888',
        workspaceId: validWorkspaceId,
        policyId: '99999999-9999-4999-a999-999999999999',
        expenseId: validExpenseId,
        userId: validUserId,
        status: ViolationStatus.PENDING,
        severity: ViolationSeverity.MEDIUM,
        violationDetails: 'Old violation details',
        expenseAmount: 100,
        currency: 'USD',
        acknowledgedBy: null,
        acknowledgedAt: null,
        resolvedBy: null,
        resolvedAt: null,
        resolutionNote: null,
        overriddenBy: null,
        overrideReason: null,
        exemptionId: null,
        detectedAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.policyViolation.findMany.mockResolvedValue([staleRow]);

      const currentViolation = PolicyViolation.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.HIGH,
        violationDetails: 'Current active violation',
        expenseAmount: 120,
        currency: 'USD',
      });

      await repo.saveForExpense(
        WorkspaceId.fromString(validWorkspaceId),
        ExpenseId.fromString(validExpenseId),
        [currentViolation]
      );

      // Verify stale violation was NOT hard-deleted
      expect(mockPrisma.policyViolation.deleteMany).not.toHaveBeenCalled();

      // Verify stale violation was updated to RESOLVED with resolutionNote and SYSTEM_ACTOR_ID
      expect(mockPrisma.policyViolation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: staleRow.id,
            status: { in: [ViolationStatus.PENDING, ViolationStatus.ACKNOWLEDGED] },
          },
          data: expect.objectContaining({
            status: ViolationStatus.RESOLVED,
            resolvedBy: SYSTEM_ACTOR_ID,
            resolutionNote: 'Cleared upon expense re-evaluation',
          }),
        })
      );

      // Verify outbox event was created for the resolved violation with system actor
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aggregateId: staleRow.id,
            eventType: 'violation.resolved',
            payload: expect.objectContaining({
              resolvedBy: SYSTEM_ACTOR_ID,
            }),
          }),
        })
      );

      // Verify event was dispatched locally
      expect(mockEventBus.publishAll).toHaveBeenCalled();
    });

    it('[P1] save must throw ViolationAlreadyResolvedError if concurrent decision updated status (count: 0)', async () => {
      const violation = PolicyViolation.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.HIGH,
        violationDetails: 'Threshold breach',
        expenseAmount: 150,
      });

      violation.resolve(validUserId, 'Resolved by manager');
      mockPrisma.policyViolation.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(repo.save(violation)).rejects.toThrow(ViolationAlreadyResolvedError);
    });

    it('[P1] saveForExpense must acquire PostgreSQL advisory lock and fail if lock acquisition fails', async () => {
      mockPrisma.$executeRaw.mockRejectedValueOnce(new Error('PostgreSQL advisory lock failed'));

      await expect(
        repo.saveForExpense(
          WorkspaceId.fromString(validWorkspaceId),
          ExpenseId.fromString(validExpenseId),
          []
        )
      ).rejects.toThrow('PostgreSQL advisory lock failed');

      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it('[P1] saveForExpense must transition both stale PENDING and ACKNOWLEDGED violations to RESOLVED', async () => {
      const stalePending = {
        id: '11111111-aaaa-4111-a111-111111111111',
        workspaceId: validWorkspaceId,
        policyId: '22222222-bbbb-4222-a222-222222222222',
        expenseId: validExpenseId,
        userId: validUserId,
        status: ViolationStatus.PENDING,
        severity: ViolationSeverity.LOW,
        violationDetails: 'Pending breach',
        expenseAmount: 50,
        currency: 'USD',
        detectedAt: new Date(),
        updatedAt: new Date(),
      };

      const staleAcknowledged = {
        id: '33333333-cccc-4333-a333-333333333333',
        workspaceId: validWorkspaceId,
        policyId: '44444444-dddd-4444-a444-444444444444',
        expenseId: validExpenseId,
        userId: validUserId,
        status: ViolationStatus.ACKNOWLEDGED,
        severity: ViolationSeverity.MEDIUM,
        violationDetails: 'Acknowledged breach',
        expenseAmount: 80,
        currency: 'USD',
        detectedAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.policyViolation.findMany.mockResolvedValueOnce([stalePending, staleAcknowledged]);

      await repo.saveForExpense(
        WorkspaceId.fromString(validWorkspaceId),
        ExpenseId.fromString(validExpenseId),
        [] // No active violations remain
      );

      // Both must be updated to RESOLVED with SYSTEM_ACTOR_ID
      expect(mockPrisma.policyViolation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: stalePending.id,
            status: { in: [ViolationStatus.PENDING, ViolationStatus.ACKNOWLEDGED] },
          },
          data: expect.objectContaining({
            status: ViolationStatus.RESOLVED,
            resolvedBy: SYSTEM_ACTOR_ID,
            resolutionNote: 'Cleared upon expense re-evaluation',
          }),
        })
      );
      expect(mockPrisma.policyViolation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: staleAcknowledged.id,
            status: { in: [ViolationStatus.PENDING, ViolationStatus.ACKNOWLEDGED] },
          },
          data: expect.objectContaining({
            status: ViolationStatus.RESOLVED,
            resolvedBy: SYSTEM_ACTOR_ID,
            resolutionNote: 'Cleared upon expense re-evaluation',
          }),
        })
      );
    });

    it('[P1] saveForExpense must preserve terminal decisions (RESOLVED, EXEMPTED, OVERRIDDEN) and must not overwrite status or clear lifecycle fields on re-evaluation', async () => {
      // 1. stale check returns empty
      mockPrisma.policyViolation.findMany.mockResolvedValueOnce([]);
      // 2. existing violation check returns an already RESOLVED violation
      const resolvedViolationId = '44444444-4444-4444-a444-444444444444';
      const resolvedAtDate = new Date('2026-01-01T10:00:00Z');
      const existingResolvedRow = {
        id: resolvedViolationId,
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        status: ViolationStatus.RESOLVED,
        severity: ViolationSeverity.MEDIUM,
        violationDetails: 'Original details',
        expenseAmount: 100,
        currency: 'USD',
        acknowledgedBy: null,
        acknowledgedAt: null,
        resolvedBy: validUserId,
        resolvedAt: resolvedAtDate,
        resolutionNote: 'Manager approved exception manually',
        overriddenBy: null,
        overrideReason: null,
        exemptionId: null,
        detectedAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.policyViolation.findMany.mockResolvedValueOnce([existingResolvedRow]);

      const activeViolation = PolicyViolation.create({
        id: resolvedViolationId,
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.HIGH,
        violationDetails: 'Reevaluated breach with new amount',
        expenseAmount: 250,
        currency: 'USD',
      });

      await repo.saveForExpense(
        WorkspaceId.fromString(validWorkspaceId),
        ExpenseId.fromString(validExpenseId),
        [activeViolation]
      );

      // Verify it did NOT revert status to PENDING or null out resolved fields
      expect(mockPrisma.policyViolation.update).toHaveBeenCalledWith({
        where: { id: resolvedViolationId },
        data: expect.objectContaining({
          expenseAmount: 250,
          severity: ViolationSeverity.HIGH,
          violationDetails: 'Reevaluated breach with new amount',
        }),
      });
      // The update must NOT set status: PENDING, resolvedBy: null, or resolutionNote: null
      const updateCall = mockPrisma.policyViolation.update.mock.calls.find(
        (call: any[]) => call[0]?.where?.id === resolvedViolationId
      );
      expect(updateCall[0].data.status).toBeUndefined();
      expect(updateCall[0].data.resolvedBy).toBeUndefined();
      expect(updateCall[0].data.resolvedAt).toBeUndefined();
      expect(updateCall[0].data.resolutionNote).toBeUndefined();

      // No new outbox event should be emitted for an already-resolved violation
      expect(mockPrisma.outboxEvent.create).not.toHaveBeenCalled();
    });

    it('[P1] saveForExpense must preserve ACKNOWLEDGED state and not revert to PENDING on re-evaluation', async () => {
      mockPrisma.policyViolation.findMany.mockResolvedValueOnce([]);
      const ackViolationId = '55555555-5555-4555-a555-555555555555';
      const existingAckRow = {
        id: ackViolationId,
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        status: ViolationStatus.ACKNOWLEDGED,
        severity: ViolationSeverity.MEDIUM,
        violationDetails: 'Employee acknowledged',
        expenseAmount: 100,
        currency: 'USD',
        acknowledgedBy: validUserId,
        acknowledgedAt: new Date(),
        resolvedBy: null,
        resolvedAt: null,
        resolutionNote: null,
        overriddenBy: null,
        overrideReason: null,
        exemptionId: null,
        detectedAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.policyViolation.findMany.mockResolvedValueOnce([existingAckRow]);

      const activeViolation = PolicyViolation.create({
        id: ackViolationId,
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.HIGH,
        violationDetails: 'Updated breach',
        expenseAmount: 180,
        currency: 'USD',
      });

      await repo.saveForExpense(
        WorkspaceId.fromString(validWorkspaceId),
        ExpenseId.fromString(validExpenseId),
        [activeViolation]
      );

      const updateCall = mockPrisma.policyViolation.update.mock.calls.find(
        (call: any[]) => call[0]?.where?.id === ackViolationId
      );
      expect(updateCall[0].data.status).toBeUndefined();
      expect(updateCall[0].data.acknowledgedBy).toBeUndefined();
      expect(updateCall[0].data.acknowledgedAt).toBeUndefined();
    });

    it('[P1] saveForExpense creates new violations and emits outbox events when rows do not exist', async () => {
      mockPrisma.policyViolation.findMany.mockResolvedValueOnce([]); // No stale rows
      mockPrisma.policyViolation.findMany.mockResolvedValueOnce([]); // No existing rows

      const violationId = '66666666-6666-4666-a666-666666666666';
      const createdRow = {
        id: violationId,
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        status: ViolationStatus.PENDING,
        severity: ViolationSeverity.HIGH,
        violationDetails: 'New violation details',
        expenseAmount: 200,
        currency: 'USD',
        acknowledgedBy: null,
        acknowledgedAt: null,
        resolvedBy: null,
        resolvedAt: null,
        resolutionNote: null,
        overriddenBy: null,
        overrideReason: null,
        exemptionId: null,
        detectedAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.policyViolation.create.mockResolvedValueOnce(createdRow);

      const activeViolation = PolicyViolation.create({
        id: violationId,
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.HIGH,
        violationDetails: 'New violation details',
        expenseAmount: 200,
        currency: 'USD',
      });

      await expect(
        repo.saveForExpense(
          WorkspaceId.fromString(validWorkspaceId),
          ExpenseId.fromString(validExpenseId),
          [activeViolation]
        )
      ).resolves.not.toThrow();

      expect(mockPrisma.policyViolation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: violationId,
          expenseAmount: 200,
          severity: ViolationSeverity.HIGH,
          violationDetails: 'New violation details',
        }),
      });
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalled();
    });

    it('[P1] save must throw ViolationAlreadyResolvedError when stale ACKNOWLEDGED aggregate attempts to update an already RESOLVED violation', async () => {
      const violation = PolicyViolation.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.HIGH,
        violationDetails: 'Threshold breach',
        expenseAmount: 150,
        currency: 'USD',
      });
      violation.acknowledge(UserId.fromString(validUserId), 'First ack');

      // DB row already exists and is RESOLVED, so updateMany on { status: in: [PENDING, ACKNOWLEDGED] } matches 0 rows
      mockPrisma.policyViolation.findUnique.mockResolvedValueOnce({
        id: violation.id.getValue(),
        status: ViolationStatus.RESOLVED,
      });
      mockPrisma.policyViolation.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(repo.save(violation)).rejects.toThrow(ViolationAlreadyResolvedError);
    });

    it('[P1] saveForExpense must NOT emit clearing outbox events or local events when concurrent resolution wins the race (count: 0)', async () => {
      const stalePending = {
        id: '11111111-aaaa-4111-a111-111111111111',
        workspaceId: validWorkspaceId,
        policyId: '22222222-bbbb-4222-a222-222222222222',
        expenseId: validExpenseId,
        userId: validUserId,
        status: ViolationStatus.PENDING,
        severity: ViolationSeverity.LOW,
        violationDetails: 'Pending breach',
        expenseAmount: 50,
        currency: 'USD',
        detectedAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.policyViolation.findMany.mockResolvedValueOnce([stalePending]);
      // Concurrent transaction resolved it between findMany and updateMany
      mockPrisma.policyViolation.updateMany.mockResolvedValueOnce({ count: 0 });

      await repo.saveForExpense(
        WorkspaceId.fromString(validWorkspaceId),
        ExpenseId.fromString(validExpenseId),
        []
      );

      // Must NOT create outbox event because count was 0
      expect(mockPrisma.outboxEvent.create).not.toHaveBeenCalled();
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it('[P2] resolve without notes must explicitly write resolutionNote as null to clear prior acknowledgement note', async () => {
      const violation = PolicyViolation.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.HIGH,
        violationDetails: 'Threshold breach',
        expenseAmount: 150,
        currency: 'USD',
      });
      violation.acknowledge(UserId.fromString(validUserId), 'Temporary acknowledgement note');
      expect(violation.resolutionNotes).toBe('Temporary acknowledgement note');

      // Resolve without notes clears resolutionNotes to undefined
      violation.resolve(UserId.fromString(validUserId));
      expect(violation.resolutionNotes).toBeUndefined();

      mockPrisma.policyViolation.updateMany.mockResolvedValueOnce({ count: 1 });

      await repo.save(violation);

      expect(mockPrisma.policyViolation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resolutionNote: null,
            status: ViolationStatus.RESOLVED,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // 3. PrismaExemptionRepository
  // ==========================================================================
  describe('PrismaExemptionRepository', () => {
    let repo: PrismaExemptionRepository;

    beforeEach(() => {
      repo = new PrismaExemptionRepository(mockPrisma as unknown as PrismaClient, mockEventBus);
    });

    it('should save exemption and outbox events in one transaction, then dispatch locally', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 86400000);
      const exemption = PolicyExemption.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'Client dinner exemption request',
        startDate: now,
        endDate: future,
      });

      expect(exemption.domainEvents.length).toBeGreaterThan(0);

      await repo.save(exemption);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.policyExemption.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: exemption.id.getValue(),
            workspaceId: validWorkspaceId,
            userId: validUserId,
          }),
        })
      );
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aggregateId: exemption.id.getValue(),
            aggregateType: 'PolicyExemption',
            eventType: 'exemption.requested',
          }),
        })
      );
      expect(mockEventBus.publishAll).toHaveBeenCalled();
      expect(exemption.domainEvents).toHaveLength(0);
    });

    it('[P2] findByWorkspace and countByWorkspace must honor startDate, endDate, and policyId', async () => {
      mockPrisma.policyExemption.findMany.mockResolvedValue([]);
      mockPrisma.policyExemption.count.mockResolvedValue(2);

      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-30');

      await repo.findByWorkspace(WorkspaceId.fromString(validWorkspaceId), {
        status: ExemptionStatus.APPROVED,
        userId: validUserId,
        policyId: validPolicyId,
        startDate,
        endDate,
      });

      expect(mockPrisma.policyExemption.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            workspaceId: validWorkspaceId,
            status: ExemptionStatus.APPROVED,
            userId: validUserId,
            policyId: validPolicyId,
            AND: [
              { validUntil: { gte: startDate } },
              { validFrom: { lte: endDate } },
            ],
          },
        })
      );

      const count = await repo.countByWorkspace(WorkspaceId.fromString(validWorkspaceId), {
        status: ExemptionStatus.APPROVED,
        policyId: validPolicyId,
        startDate,
        endDate,
      });

      expect(count).toBe(2);
      expect(mockPrisma.policyExemption.count).toHaveBeenCalledWith({
        where: {
          workspaceId: validWorkspaceId,
          status: ExemptionStatus.APPROVED,
          policyId: validPolicyId,
          AND: [
            { validUntil: { gte: startDate } },
            { validFrom: { lte: endDate } },
          ],
        },
      });
    });

    it('should batch load exemptions for multiple policy IDs avoiding N+1 queries', async () => {
      mockPrisma.policyExemption.findMany.mockResolvedValue([
        {
          id: '66666666-6666-4666-a666-666666666666',
          workspaceId: validWorkspaceId,
          policyId: validPolicyId,
          userId: validUserId,
          requestedBy: validUserId,
          reason: 'Valid exemption',
          status: ExemptionStatus.APPROVED,
          validFrom: new Date(Date.now() - 10000),
          validUntil: new Date(Date.now() + 100000),
          requestedAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const map = await repo.findActiveForUserPolicies(
        WorkspaceId.fromString(validWorkspaceId),
        UserId.fromString(validUserId),
        [PolicyId.fromString(validPolicyId)]
      );

      expect(map.size).toBe(1);
      expect(map.has(validPolicyId)).toBe(true);
      expect(map.get(validPolicyId)?.status).toBe(ExemptionStatus.APPROVED);
    });

    it('should persist approvalNote in upsert and map it back to domain entity via findById', async () => {
      const exemption = PolicyExemption.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'VIP Dinner',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
      });

      exemption.approve(UserId.fromString(validUserId), 'Authorized by finance lead');
      expect(exemption.approvalNote).toBe('Authorized by finance lead');

      await repo.save(exemption);

      expect(mockPrisma.policyExemption.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: exemption.id.getValue(),
            status: ExemptionStatus.PENDING,
          },
          data: expect.objectContaining({
            approvalNote: 'Authorized by finance lead',
            status: ExemptionStatus.APPROVED,
          }),
        })
      );

      mockPrisma.policyExemption.findUnique.mockResolvedValue({
        id: exemption.id.getValue(),
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'VIP Dinner',
        status: ExemptionStatus.APPROVED,
        validFrom: exemption.startDate,
        validUntil: exemption.endDate,
        requestedAt: exemption.createdAt,
        updatedAt: exemption.updatedAt,
        approvedBy: validUserId,
        approvedAt: exemption.approvedAt,
        approvalNote: 'Authorized by finance lead',
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
      });

      const loaded = await repo.findById(exemption.id);
      expect(loaded).not.toBeNull();
      expect(loaded?.approvalNote).toBe('Authorized by finance lead');
      expect(loaded?.status).toBe(ExemptionStatus.APPROVED);
    });

    it('[P1] expireExpiredBatch must query raw SQL with FOR UPDATE SKIP LOCKED fail-fast without fallback', async () => {
      const validExemptionId = '66666666-6666-4666-a666-666666666666';
      mockPrisma.$queryRaw.mockResolvedValue([{ id: validExemptionId }]);
      mockPrisma.policyExemption.findMany.mockResolvedValue([
        {
          id: validExemptionId,
          workspaceId: validWorkspaceId,
          policyId: validPolicyId,
          userId: validUserId,
          requestedBy: validUserId,
          reason: 'Test reason',
          status: ExemptionStatus.APPROVED,
          validFrom: new Date(Date.now() - 20000),
          validUntil: new Date(Date.now() - 10000),
          requestedAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const expiredCount = await repo.expireExpiredBatch(
        WorkspaceId.fromString(validWorkspaceId),
        new Date()
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(expiredCount).toBe(1);
    });

    it('[P1] expireExpiredBatch must fail-fast if $queryRaw throws', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection lost'));

      await expect(
        repo.expireExpiredBatch(WorkspaceId.fromString(validWorkspaceId), new Date())
      ).rejects.toThrow('Connection lost');
    });

    it('[P1] should persist exemption scope and reconstitute it in toDomain', async () => {
      const exemption = PolicyExemption.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'VIP Dinner with category restriction',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        scope: {
          categoryIds: ['11111111-2222-3333-4444-555555555555'],
          maxAmount: 150,
        },
      });

      expect(exemption.scope?.categoryIds).toContain('11111111-2222-3333-4444-555555555555');
      expect(exemption.scope?.maxAmount).toBe(150);

      await repo.save(exemption);

      expect(mockPrisma.policyExemption.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scope: {
              categoryIds: ['11111111-2222-3333-4444-555555555555'],
              maxAmount: 150,
            },
          }),
        })
      );

      mockPrisma.policyExemption.findUnique.mockResolvedValue({
        id: exemption.id.getValue(),
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'VIP Dinner with category restriction',
        status: ExemptionStatus.PENDING,
        validFrom: exemption.startDate,
        validUntil: exemption.endDate,
        scope: {
          categoryIds: ['11111111-2222-3333-4444-555555555555'],
          maxAmount: 150,
        },
        requestedAt: exemption.createdAt,
        updatedAt: exemption.updatedAt,
      });

      const loaded = await repo.findById(exemption.id);
      expect(loaded?.scope?.maxAmount).toBe(150);
      expect(loaded?.scope?.categoryIds).toEqual(['11111111-2222-3333-4444-555555555555']);
    });

    it('[P1] save must throw ExemptionAlreadyProcessedError if concurrent decision updated status (count: 0)', async () => {
      const exemption = PolicyExemption.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'VIP Dinner exemption',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
      });

      exemption.approve(validUserId, 'Approved by lead');
      mockPrisma.policyExemption.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(repo.save(exemption)).rejects.toThrow(ExemptionAlreadyProcessedError);
    });

    it('[P1] save must throw ExemptionAlreadyProcessedError when stale PENDING update attempts to overwrite an already APPROVED exemption', async () => {
      const exemption = PolicyExemption.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'VIP Dinner exemption',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
      });

      // Existing row in DB has reached APPROVED
      mockPrisma.policyExemption.findUnique.mockResolvedValueOnce({
        id: exemption.id.getValue(),
        status: ExemptionStatus.APPROVED,
      });
      // Conditional update requires status: PENDING, matching 0 rows
      mockPrisma.policyExemption.updateMany.mockResolvedValueOnce({ count: 0 });

      // In-memory aggregate is still PENDING
      await expect(repo.save(exemption)).rejects.toThrow(ExemptionAlreadyProcessedError);
    });
  });

  // ==========================================================================
  // 4. [P1] Unsupported Policy Types (DAILY_LIMIT, WEEKLY_LIMIT, MONTHLY_LIMIT)
  // ==========================================================================
  describe('[P1] Unsupported Policy Types', () => {
    it('should reject creation of DAILY_LIMIT with InvalidPolicyConfigurationError', () => {
      expect(() => {
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Daily Spending Cap',
          policyType: PolicyType.DAILY_LIMIT,
          severity: ViolationSeverity.HIGH,
          configuration: { threshold: 100 },
          createdBy: validUserId,
        });
      }).toThrow(InvalidPolicyConfigurationError);
    });

    it('should reject creation of WEEKLY_LIMIT with InvalidPolicyConfigurationError', () => {
      expect(() => {
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Weekly Spending Cap',
          policyType: PolicyType.WEEKLY_LIMIT,
          severity: ViolationSeverity.HIGH,
          configuration: { threshold: 500 },
          createdBy: validUserId,
        });
      }).toThrow(InvalidPolicyConfigurationError);
    });

    it('should reject creation of MONTHLY_LIMIT with InvalidPolicyConfigurationError', () => {
      expect(() => {
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Monthly Spending Cap',
          policyType: PolicyType.MONTHLY_LIMIT,
          severity: ViolationSeverity.HIGH,
          configuration: { threshold: 2000 },
          createdBy: validUserId,
        });
      }).toThrow(InvalidPolicyConfigurationError);
    });

    it('should reject activation of loaded inactive DAILY_LIMIT policy', () => {
      const policy = ExpensePolicy.fromPersistence({
        policyId: PolicyId.fromString(validPolicyId),
        workspaceId: WorkspaceId.fromString(validWorkspaceId),
        name: 'Legacy Daily Limit',
        policyType: PolicyType.DAILY_LIMIT,
        severity: ViolationSeverity.MEDIUM,
        configuration: { threshold: 100 },
        isActive: false,
        priority: 1,
        createdBy: UserId.fromString(validUserId),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(() => policy.activate()).toThrow(InvalidPolicyConfigurationError);
    });

    it('should throw PolicyEvaluationError if an active DAILY_LIMIT policy is evaluated', async () => {
      const unsupportedPolicy = ExpensePolicy.fromPersistence({
        policyId: PolicyId.fromString(validPolicyId),
        workspaceId: WorkspaceId.fromString(validWorkspaceId),
        name: 'Legacy Daily Limit',
        policyType: PolicyType.DAILY_LIMIT,
        severity: ViolationSeverity.MEDIUM,
        configuration: { threshold: 100 },
        isActive: true,
        priority: 1,
        createdBy: UserId.fromString(validUserId),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockPolicyRepo: any = {
        findActiveByWorkspace: async () => ({ items: [unsupportedPolicy], total: 1 }),
        findAllActiveByWorkspace: async () => [unsupportedPolicy],
      };
      const mockViolationRepo: any = {
        save: async () => { },
      };
      const mockExemptionRepo: any = {
        findActiveForUserPolicies: async () => new Map(),
      };

      const evalService = new PolicyEvaluationService(
        mockPolicyRepo,
        mockViolationRepo,
        mockExemptionRepo
      );

      await expect(
        evalService.evaluateExpense({
          expenseId: validExpenseId,
          workspaceId: validWorkspaceId,
          userId: validUserId,
          amount: 150,
          currency: 'USD',
          hasReceipt: true,
          expenseDate: new Date(),
        })
      ).rejects.toThrow(PolicyEvaluationError);
    });
  });
});