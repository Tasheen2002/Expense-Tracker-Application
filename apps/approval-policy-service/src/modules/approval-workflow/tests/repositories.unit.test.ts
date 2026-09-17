import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '../../../shared/infrastructure/persistence/prisma.client';
import { PrismaApprovalChainRepository } from '../infrastructure/persistence/approval-chain.repository.impl';
import { PrismaExpenseWorkflowRepository } from '../infrastructure/persistence/expense-workflow.repository.impl';
import { ApprovalChain } from '../domain/entities/approval-chain.entity';
import { ExpenseWorkflow } from '../domain/entities/expense-workflow.entity';
import { ApprovalChainId, WorkflowId, ApprovalStepId } from '../domain/value-objects';
import { WorkflowStatus } from '../domain/enums';
import { WorkspaceId, UserId, ExpenseId, CategoryId } from '@core/domain/value-objects';
import { IEventBus } from '@core/domain/events/domain-event';
import {
  ConcurrencyConflictError,
  ApprovalChainInUseError,
} from '../domain/errors/approval-workflow.errors';
import { APPROVAL_POLICY_EVENTS } from '../../../shared/events/approval-policy-events';

describe('Approval Workflow Repositories Unit Tests', () => {
  let mockPrisma: any;
  let mockEventBus: IEventBus;

  beforeEach(() => {
    mockEventBus = {
      publish: vi.fn(),
      publishAll: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };

    mockPrisma = {
      approvalChain: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
        upsert: vi.fn(),
        count: vi.fn(),
        delete: vi.fn(),
      },
      expenseWorkflow: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      approvalStep: {
        upsert: vi.fn(),
      },
      outboxEvent: {
        create: vi.fn().mockResolvedValue({}),
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
      $queryRaw: vi.fn(),
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
    };
  });

  describe('PrismaApprovalChainRepository', () => {
    let repo: PrismaApprovalChainRepository;

    beforeEach(() => {
      repo = new PrismaApprovalChainRepository(mockPrisma as unknown as PrismaClient, mockEventBus);
    });

    it('should save a new chain with version 1 and dispatch events', async () => {
      const chain = ApprovalChain.create({
        workspaceId: '11111111-1111-4111-a111-111111111111',
        name: 'Finance Approvals',
        minAmount: 100,
        maxAmount: 500,
        requiresReceipt: true,
        approverSequence: ['22222222-2222-4222-a222-222222222222'],
      });

      mockPrisma.approvalChain.findUnique.mockResolvedValue(null);
      mockPrisma.approvalChain.create.mockResolvedValue({});

      await repo.save(chain);

      expect(mockPrisma.approvalChain.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: chain.id.getValue(),
            version: 1,
          }),
        })
      );
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aggregateId: chain.id.getValue(),
            eventType: APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_CREATED,
            status: 'PENDING',
          }),
        })
      );
      expect(mockEventBus.publishAll).toHaveBeenCalled();
      expect(chain.domainEvents).toHaveLength(0);
    });

    it('should explicitly persist null for cleared optional fields on chain update and increment version', async () => {
      const chain = ApprovalChain.create({
        workspaceId: '11111111-1111-4111-a111-111111111111',
        name: 'Finance Approvals',
        minAmount: 100,
        maxAmount: 500,
        requiresReceipt: true,
        approverSequence: ['22222222-2222-4222-a222-222222222222'],
      });

      // Clear range and description
      chain.updateAmountRange(undefined, undefined);
      chain.updateDescription(undefined);

      mockPrisma.approvalChain.findUnique.mockResolvedValue({ version: 1 });
      mockPrisma.approvalChain.updateMany.mockResolvedValue({ count: 1 });

      await repo.save(chain);

      expect(mockPrisma.approvalChain.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: chain.id.getValue(), version: 1 },
          data: expect.objectContaining({
            description: null,
            minAmount: null,
            maxAmount: null,
            version: { increment: 1 },
          }),
        })
      );
      expect(chain.version).toBe(2);
    });

    it('should throw ConcurrencyConflictError when optimistic update matches 0 rows', async () => {
      const chain = ApprovalChain.fromPersistence({
        chainId: ApprovalChainId.create(),
        workspaceId: WorkspaceId.create(),
        name: 'Concurrent Chain',
        requiresReceipt: false,
        approverSequence: [UserId.create()],
        isActive: true,
        version: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.approvalChain.findUnique.mockResolvedValue({ version: 2 });
      mockPrisma.approvalChain.updateMany.mockResolvedValue({ count: 0 });

      await expect(repo.save(chain)).rejects.toThrow(ConcurrencyConflictError);
      expect(chain.version).toBe(2);
    });

    it('should retain original chain aggregate version if transaction fails', async () => {
      const chain = ApprovalChain.fromPersistence({
        chainId: ApprovalChainId.create(),
        workspaceId: WorkspaceId.create(),
        name: 'Failing Chain',
        requiresReceipt: false,
        approverSequence: [UserId.create()],
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.approvalChain.findUnique.mockResolvedValue({ version: 1 });
      mockPrisma.approvalChain.updateMany.mockRejectedValueOnce(
        new Error('Database transaction failure')
      );

      await expect(repo.save(chain)).rejects.toThrow('Database transaction failure');
      expect(chain.version).toBe(1);
    });

    it('should clear aggregate domain events and resolve save even if in-memory event dispatch throws (Finding 1)', async () => {
      const chain = ApprovalChain.create({
        workspaceId: '11111111-1111-4111-a111-111111111111',
        name: 'Resilient Chain',
        minAmount: 100,
        requiresReceipt: false,
        approverSequence: ['22222222-2222-4222-a222-222222222222'],
      });

      mockPrisma.approvalChain.findUnique.mockResolvedValue(null);
      mockPrisma.approvalChain.create.mockResolvedValue({});
      (mockEventBus.publishAll as any).mockRejectedValueOnce(new Error('Subscriber crashed'));

      await expect(repo.save(chain)).resolves.not.toThrow();
      expect(chain.domainEvents).toHaveLength(0);
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalled();
    });

    it('should findById with VO and map to domain', async () => {
      const chainId = ApprovalChainId.create();
      mockPrisma.approvalChain.findUnique.mockResolvedValue({
        id: chainId.getValue(),
        workspaceId: '11111111-1111-4111-a111-111111111111',
        name: 'Exec Chain',
        description: null,
        minAmount: '100.00',
        maxAmount: '1000.00',
        categoryIds: [],
        requiresReceipt: false,
        approverSequence: ['22222222-2222-4222-a222-222222222222'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const resultVO = await repo.findById(chainId);
      expect(resultVO).not.toBeNull();
      expect(resultVO?.name).toBe('Exec Chain');
      expect(resultVO?.id.equals(chainId)).toBe(true);
    });

    it('should accurately reconstruct zero-value decimal boundaries as 0 (not undefined)', async () => {
      const chainId = ApprovalChainId.create();
      mockPrisma.approvalChain.findUnique.mockResolvedValue({
        id: chainId.getValue(),
        workspaceId: '11111111-1111-4111-a111-111111111111',
        name: 'Zero Boundary Chain',
        description: null,
        minAmount: 0,
        maxAmount: 0,
        categoryIds: [],
        requiresReceipt: false,
        approverSequence: ['22222222-2222-4222-a222-222222222222'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repo.findById(chainId);
      expect(result).not.toBeNull();
      expect(result?.minAmount).toBe(0);
      expect(result?.maxAmount).toBe(0);
    });

    it('should return null when findById does not find row', async () => {
      mockPrisma.approvalChain.findUnique.mockResolvedValue(null);
      const result = await repo.findById(ApprovalChainId.create());
      expect(result).toBeNull();
    });

    it('should findByWorkspaceId and findActiveByWorkspaceId with deterministic sorting', async () => {
      const wsId = WorkspaceId.create();
      mockPrisma.approvalChain.findMany.mockResolvedValue([]);
      mockPrisma.approvalChain.count.mockResolvedValue(0);

      const resAll = await repo.findByWorkspaceId(wsId, { limit: 10, offset: 0 });
      expect(resAll.items).toEqual([]);
      expect(mockPrisma.approvalChain.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: wsId.getValue() },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          take: 10,
          skip: 0,
        })
      );

      // findActiveByWorkspaceId
      await repo.findActiveByWorkspaceId(wsId);
      expect(mockPrisma.approvalChain.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: wsId.getValue(), isActive: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        })
      );
    });

    it('should findApplicableChain matching amount range and category', async () => {
      const catId = CategoryId.create();
      const wsId = WorkspaceId.create();
      const row = {
        id: '99999999-9999-4999-a999-999999999999',
        workspaceId: wsId.getValue(),
        name: 'Hardware Chain',
        description: null,
        minAmount: '50.00',
        maxAmount: '500.00',
        categoryIds: [catId.getValue()],
        requiresReceipt: true,
        approverSequence: ['22222222-2222-4222-a222-222222222222'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.approvalChain.findMany.mockResolvedValue([row]);

      const match = await repo.findApplicableChain({
        workspaceId: wsId,
        amount: 200,
        categoryId: catId,
        hasReceipt: true,
      });

      expect(match).not.toBeNull();
      expect(match?.name).toBe('Hardware Chain');
      expect(mockPrisma.approvalChain.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: wsId.getValue(),
            isActive: true,
          }),
        })
      );

      // Does not match if receipt missing
      const noMatch = await repo.findApplicableChain({
        workspaceId: wsId,
        amount: 200,
        categoryId: catId,
        hasReceipt: false,
      });
      expect(noMatch).toBeNull();
    });

    it('should delete chain and dispatch ApprovalChainDeletedEvent', async () => {
      const chain = ApprovalChain.create({
        workspaceId: '11111111-1111-4111-a111-111111111111',
        name: 'To Delete',
        minAmount: 100,
        requiresReceipt: false,
        approverSequence: ['22222222-2222-4222-a222-222222222222'],
      });

      chain.clearDomainEvents();
      chain.markAsDeleted();
      expect(chain.domainEvents).toHaveLength(1);

      mockPrisma.approvalChain.delete.mockResolvedValue({});

      await repo.delete(chain);

      expect(mockPrisma.approvalChain.delete).toHaveBeenCalledWith({
        where: { id: chain.id.getValue() },
      });
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aggregateId: chain.id.getValue(),
            eventType: APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_DELETED,
            status: 'PENDING',
          }),
        })
      );
      expect(mockEventBus.publishAll).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ eventType: APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_DELETED }),
        ])
      );
      expect(chain.domainEvents).toHaveLength(0);
    });

    it('should check exists and countByWorkspaceId', async () => {
      const chainId = ApprovalChainId.create();
      const wsId = WorkspaceId.create();

      mockPrisma.approvalChain.count.mockResolvedValueOnce(1);
      const existsTrue = await repo.exists(chainId);
      expect(existsTrue).toBe(true);

      mockPrisma.approvalChain.count.mockResolvedValueOnce(0);
      const existsFalse = await repo.exists(chainId);
      expect(existsFalse).toBe(false);

      mockPrisma.approvalChain.count.mockResolvedValueOnce(5);
      const count = await repo.countByWorkspaceId(wsId);
      expect(count).toBe(5);
      expect(mockPrisma.approvalChain.count).toHaveBeenCalledWith({
        where: { workspaceId: wsId.getValue() },
      });
    });

    it('should check if chain has referencing workflows via hasReferencingWorkflows', async () => {
      const chainId = ApprovalChainId.create();
      mockPrisma.expenseWorkflow.count.mockResolvedValueOnce(2);

      const inUse = await repo.hasReferencingWorkflows(chainId);
      expect(inUse).toBe(true);
      expect(mockPrisma.expenseWorkflow.count).toHaveBeenCalledWith({
        where: { chainId: chainId.getValue() },
      });

      mockPrisma.expenseWorkflow.count.mockResolvedValueOnce(0);
      const notInUse = await repo.hasReferencingWorkflows(chainId);
      expect(notInUse).toBe(false);
    });

    it('should catch foreign key violation (P2003) on delete and throw ApprovalChainInUseError', async () => {
      const chain = ApprovalChain.create({
        workspaceId: '11111111-1111-4111-a111-111111111111',
        name: 'In Use Chain',
        minAmount: 100,
        requiresReceipt: false,
        approverSequence: ['22222222-2222-4222-a222-222222222222'],
      });

      mockPrisma.approvalChain.delete.mockRejectedValueOnce({
        code: 'P2003',
        message: 'Foreign key constraint failed on field chainId',
      });

      await expect(repo.delete(chain)).rejects.toThrow(ApprovalChainInUseError);
    });
  });

  describe('PrismaExpenseWorkflowRepository', () => {
    let repo: PrismaExpenseWorkflowRepository;

    beforeEach(() => {
      repo = new PrismaExpenseWorkflowRepository(mockPrisma as unknown as PrismaClient, mockEventBus);
    });

    it('should save a new workflow with version 1 using immutable snapshots', async () => {
      const workflow = ExpenseWorkflow.create({
        expenseId: '11111111-1111-4111-a111-111111111111',
        workspaceId: '22222222-2222-4222-a222-222222222222',
        userId: '33333333-3333-4333-a333-333333333333',
        chainId: '44444444-4444-4444-a444-444444444444',
        approverSequence: ['55555555-5555-4555-a555-555555555555'],
      });

      workflow.start();

      mockPrisma.expenseWorkflow.findUnique.mockResolvedValue(null);
      mockPrisma.expenseWorkflow.create.mockResolvedValue({});
      mockPrisma.approvalStep.upsert.mockResolvedValue({});

      await repo.save(workflow);

      expect(mockPrisma.expenseWorkflow.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: workflow.id.getValue(),
            version: 1,
          }),
        })
      );
      expect(mockPrisma.approvalStep.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aggregateId: workflow.id.getValue(),
            eventType: APPROVAL_POLICY_EVENTS.WORKFLOW_STARTED,
            status: 'PENDING',
          }),
        })
      );
      expect(mockEventBus.publishAll).toHaveBeenCalled();
    });

    it('should persist null for step optional fields (delegatedTo, comments, processedAt) during save', async () => {
      const workflow = ExpenseWorkflow.create({
        expenseId: '11111111-1111-4111-a111-111111111111',
        workspaceId: '22222222-2222-4222-a222-222222222222',
        userId: '33333333-3333-4333-a333-333333333333',
        chainId: '44444444-4444-4444-a444-444444444444',
        approverSequence: ['55555555-5555-4555-a555-555555555555'],
      });

      mockPrisma.expenseWorkflow.findUnique.mockResolvedValue(null);
      mockPrisma.expenseWorkflow.create.mockResolvedValue({});
      mockPrisma.approvalStep.upsert.mockResolvedValue({});

      await repo.save(workflow);

      expect(mockPrisma.approvalStep.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            delegatedTo: null,
            comments: null,
            processedAt: null,
          }),
          update: expect.objectContaining({
            delegatedTo: null,
            comments: null,
            processedAt: null,
          }),
        })
      );
    });

    it('should sort steps deterministically by stepNumber in toDomain even if Prisma returns unordered steps', async () => {
      const workflowId = WorkflowId.create();
      const mockRow = {
        id: workflowId.getValue(),
        expenseId: '11111111-1111-4111-a111-111111111111',
        workspaceId: '22222222-2222-4222-a222-222222222222',
        userId: '33333333-3333-4333-a333-333333333333',
        chainId: '44444444-4444-4444-a444-444444444444',
        status: 'IN_PROGRESS',
        currentStepNumber: 1,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        steps: [
          {
            id: '22222222-0000-4000-a000-000000000002',
            workflowId: workflowId.getValue(),
            stepNumber: 2,
            approverId: '66666666-6666-4666-a666-666666666666',
            delegatedTo: null,
            status: 'PENDING',
            comments: null,
            processedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: '11111111-0000-4000-a000-000000000001',
            workflowId: workflowId.getValue(),
            stepNumber: 1,
            approverId: '55555555-5555-4555-a555-555555555555',
            delegatedTo: null,
            status: 'PENDING',
            comments: null,
            processedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      mockPrisma.expenseWorkflow.findUnique.mockResolvedValue(mockRow);

      const workflow = await repo.findById(workflowId);
      expect(workflow).not.toBeNull();
      expect(workflow?.steps[0].stepNumber).toBe(1);
      expect(workflow?.steps[1].stepNumber).toBe(2);
    });

    it('should update existing workflow with version increment and sync version', async () => {
      const workflow = ExpenseWorkflow.fromPersistence({
        workflowId: WorkflowId.create(),
        expenseId: ExpenseId.create(),
        workspaceId: WorkspaceId.create(),
        userId: UserId.create(),
        chainId: ApprovalChainId.create(),
        status: WorkflowStatus.IN_PROGRESS,
        currentStepNumber: 1,
        version: 1,
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.expenseWorkflow.findUnique.mockResolvedValue({ version: 1 });
      mockPrisma.expenseWorkflow.updateMany.mockResolvedValue({ count: 1 });

      await repo.save(workflow);

      expect(mockPrisma.expenseWorkflow.updateMany).toHaveBeenCalledWith({
        where: { id: workflow.id.getValue(), version: 1 },
        data: expect.objectContaining({
          version: { increment: 1 },
        }),
      });
      expect(workflow.version).toBe(2);
    });

    it('should throw ConcurrencyConflictError when optimistic update matches 0 rows', async () => {
      const workflow = ExpenseWorkflow.fromPersistence({
        workflowId: WorkflowId.create(),
        expenseId: ExpenseId.create(),
        workspaceId: WorkspaceId.create(),
        userId: UserId.create(),
        chainId: ApprovalChainId.create(),
        status: WorkflowStatus.IN_PROGRESS,
        currentStepNumber: 1,
        version: 1,
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.expenseWorkflow.findUnique.mockResolvedValue({ version: 1 });
      mockPrisma.expenseWorkflow.updateMany.mockResolvedValue({ count: 0 });

      await expect(repo.save(workflow)).rejects.toThrow(ConcurrencyConflictError);
      expect(workflow.version).toBe(1);
    });

    it('should retain original workflow aggregate version if transaction fails (Finding 5)', async () => {
      const workflow = ExpenseWorkflow.fromPersistence({
        workflowId: WorkflowId.create(),
        expenseId: ExpenseId.create(),
        workspaceId: WorkspaceId.create(),
        userId: UserId.create(),
        chainId: ApprovalChainId.create(),
        status: WorkflowStatus.IN_PROGRESS,
        currentStepNumber: 1,
        version: 1,
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.expenseWorkflow.findUnique.mockResolvedValue({ version: 1 });
      mockPrisma.expenseWorkflow.updateMany.mockRejectedValueOnce(
        new Error('Database transaction failure')
      );

      await expect(repo.save(workflow)).rejects.toThrow('Database transaction failure');
      // Aggregate in memory MUST NOT have its version incremented because the transaction failed
      expect(workflow.version).toBe(1);
    });

    it('should findById and findByExpenseId with VO', async () => {
      const workflowId = WorkflowId.create();
      const expenseId = ExpenseId.create();
      const stepId = ApprovalStepId.create();

      const mockRow = {
        id: workflowId.getValue(),
        expenseId: expenseId.getValue(),
        workspaceId: '11111111-1111-4111-a111-111111111111',
        userId: '22222222-2222-4222-a222-222222222222',
        chainId: '33333333-3333-4333-a333-333333333333',
        status: 'IN_PROGRESS',
        currentStepNumber: 1,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        steps: [
          {
            id: stepId.getValue(),
            workflowId: workflowId.getValue(),
            stepNumber: 1,
            approverId: '55555555-5555-4555-a555-555555555555',
            delegatedTo: null,
            status: 'PENDING',
            comments: null,
            processedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      mockPrisma.expenseWorkflow.findUnique.mockResolvedValue(mockRow);

      const byIdVO = await repo.findById(workflowId);
      expect(byIdVO).not.toBeNull();
      expect(byIdVO?.id.equals(workflowId)).toBe(true);

      const byExpVO = await repo.findByExpenseId(expenseId);
      expect(byExpVO).not.toBeNull();
      expect(byExpVO?.expenseId.equals(expenseId)).toBe(true);
    });

    it('should findPendingByApproverId matching only currentStepNumber and not future steps via correlated SQL', async () => {
      const wsId = WorkspaceId.create();
      const approver1 = UserId.create();
      const approver2 = UserId.create();
      const workflowId = '77777777-7777-4777-a777-777777777777';

      // 1. Approver 2 (future step): SQL correlation yields 0 matching rows
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: 0 }]);

      const resApprover2 = await repo.findPendingByApproverId(approver2, wsId);
      expect(resApprover2.items).toHaveLength(0);
      expect(resApprover2.total).toBe(0);

      // 2. Approver 1 (active current step): SQL correlation yields the active workflow
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ id: workflowId }])
        .mockResolvedValueOnce([{ count: 1 }]);

      mockPrisma.expenseWorkflow.findMany.mockResolvedValue([
        {
          id: workflowId,
          expenseId: '88888888-8888-4888-a888-888888888888',
          workspaceId: wsId.getValue(),
          userId: '33333333-3333-4333-a333-333333333333',
          chainId: '44444444-4444-4444-a444-444444444444',
          status: 'IN_PROGRESS',
          currentStepNumber: 1,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: null,
          steps: [
            {
              id: '11111111-0000-4000-a000-000000000001',
              workflowId,
              stepNumber: 1,
              approverId: approver1.getValue(),
              delegatedTo: null,
              status: 'PENDING',
              comments: null,
              processedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      ]);

      const resApprover1 = await repo.findPendingByApproverId(approver1, wsId);
      expect(resApprover1.items).toHaveLength(1);
      expect(resApprover1.total).toBe(1);
      expect(resApprover1.items[0].id.getValue()).toBe(workflowId);
    });

    it('should propagate database errors from findPendingByApproverId directly', async () => {
      const wsId = WorkspaceId.create();
      const approver = UserId.create();

      mockPrisma.$queryRaw.mockRejectedValueOnce(
        new Error('PostgreSQL connection error: relation not found')
      );

      await expect(repo.findPendingByApproverId(approver, wsId)).rejects.toThrow(
        'PostgreSQL connection error: relation not found'
      );
    });

    it('should findByWorkspaceId and findByUserId with deterministic sorting', async () => {
      const wsId = WorkspaceId.create();
      const userId = UserId.create();

      mockPrisma.expenseWorkflow.findMany.mockResolvedValue([]);
      mockPrisma.expenseWorkflow.count.mockResolvedValue(0);

      await repo.findByWorkspaceId(wsId);
      expect(mockPrisma.expenseWorkflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: wsId.getValue() },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        })
      );

      await repo.findByUserId(userId, wsId);
      expect(mockPrisma.expenseWorkflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: userId.getValue(), workspaceId: wsId.getValue() },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        })
      );
    });

    it('should check exists and countByWorkspaceId for workflow', async () => {
      const workflowId = WorkflowId.create();
      const wsId = WorkspaceId.create();

      mockPrisma.expenseWorkflow.count.mockResolvedValueOnce(1);
      expect(await repo.exists(workflowId)).toBe(true);

      mockPrisma.expenseWorkflow.count.mockResolvedValueOnce(0);
      expect(await repo.exists(workflowId)).toBe(false);

      mockPrisma.expenseWorkflow.count.mockResolvedValueOnce(3);
      expect(await repo.countByWorkspaceId(wsId)).toBe(3);
    });
  });
});
