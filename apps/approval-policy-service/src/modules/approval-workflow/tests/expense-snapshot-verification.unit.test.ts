import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkflowService } from '../application/services/workflow.service';
import { IExpenseWorkflowRepository } from '../domain/repositories/expense-workflow.repository';
import { IApprovalChainRepository } from '../domain/repositories/approval-chain.repository';
import { IWorkspaceAuthorizationService } from '../../../shared/ports/workspace-authorization.port';
import { IExpenseSnapshotService, ExpenseSnapshot } from '../../../shared/ports/expense-snapshot.port';
import { ApprovalChain } from '../domain/entities/approval-chain.entity';
import { AUTO_APPROVAL_THRESHOLD } from '../domain/constants/approval-workflow.constants';
import { HttpExpenseSnapshotAdapter } from '../../../shared/infrastructure/expense/http-expense-snapshot.adapter';
import {
  ExpenseSnapshotMismatchError,
  UnauthorizedWorkflowInitiationError,
  ExpenseNotSubmittedError,
} from '../domain/errors/approval-workflow.errors';

describe('Authoritative Expense Facts Verification (P1 Fraud Prevention)', () => {
  let mockWorkflowRepo: IExpenseWorkflowRepository;
  let mockChainRepo: IApprovalChainRepository;
  let mockAuthService: IWorkspaceAuthorizationService;
  let mockSnapshotService: IExpenseSnapshotService;

  const workspaceId = '11111111-1111-4111-a111-111111111111';
  const expenseId = '22222222-2222-4222-a222-222222222222';
  const requesterId = '33333333-3333-4333-a333-333333333333';
  const approverId = '44444444-4444-4444-a444-444444444444';
  const categoryId = '55555555-5555-4555-a555-555555555555';

  beforeEach(() => {
    mockWorkflowRepo = {
      findByExpenseId: vi.fn().mockResolvedValue(null),
      findById: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      findByWorkspaceId: vi.fn(),
      findByRequesterId: vi.fn(),
    } as unknown as IExpenseWorkflowRepository;

    const dummyChain = ApprovalChain.create({
      workspaceId,
      name: 'Standard Chain',
      approverSequence: [approverId],
      minAmount: 0,
      requiresReceipt: false,
    });

    mockChainRepo = {
      findApplicableChain: vi.fn().mockResolvedValue(dummyChain),
      findById: vi.fn(),
      save: vi.fn(),
      findByWorkspaceId: vi.fn(),
      delete: vi.fn(),
    } as unknown as IApprovalChainRepository;

    mockAuthService = {
      authorize: vi.fn().mockResolvedValue({
        userId: requesterId,
        workspaceId,
        role: 'MEMBER',
      }),
    };

    mockSnapshotService = {
      getExpenseSnapshot: vi.fn(),
    };
  });

  it('should use authoritative amount from expense snapshot rather than caller-supplied forged amount', async () => {
    // Authoritative snapshot has high amount (5000), not eligible for auto-approval
    const realSnapshot: ExpenseSnapshot = {
      expenseId,
      workspaceId,
      userId: requesterId,
      amount: 5000,
      currency: 'USD',
      categoryId,
      hasReceipt: true,
      expenseDate: new Date(),
      status: 'SUBMITTED',
    };
    (mockSnapshotService.getExpenseSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue(realSnapshot);

    const service = new WorkflowService(
      mockWorkflowRepo,
      mockChainRepo,
      mockAuthService,
      mockSnapshotService
    );

    // Caller submits workflow initiation without caller-supplied facts
    const result = await service.initiateWorkflow({
      expenseId,
      workspaceId,
      userId: requesterId,
    });

    // Verify snapshot service was consulted with actor context
    expect(mockSnapshotService.getExpenseSnapshot).toHaveBeenCalledWith({
      workspaceId,
      expenseId,
      userId: requesterId,
      authToken: undefined,
    });

    // Verify chain search used authoritative facts (5000), not caller values
    expect(mockChainRepo.findApplicableChain).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        hasReceipt: true,
      })
    );

    // Must NOT be auto-approved because authoritative amount is 5000 (> threshold 50)
    expect(result.status).toBe('in_progress');
    expect(result.currentStepNumber).toBe(1);
  });

  it('should auto-approve when authoritative amount is genuinely below threshold', async () => {
    const realSnapshot: ExpenseSnapshot = {
      expenseId,
      workspaceId,
      userId: requesterId,
      amount: AUTO_APPROVAL_THRESHOLD - 5,
      currency: 'USD',
      categoryId,
      hasReceipt: true,
      expenseDate: new Date(),
      status: 'SUBMITTED',
    };
    (mockSnapshotService.getExpenseSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue(realSnapshot);

    const service = new WorkflowService(
      mockWorkflowRepo,
      mockChainRepo,
      mockAuthService,
      mockSnapshotService
    );

    const result = await service.initiateWorkflow({
      expenseId,
      workspaceId,
      userId: requesterId,
    });

    // Auto-approves because authoritative amount is below threshold
    expect(result.status).toBe('approved');
  });

  it('should reject initiation if expense snapshot indicates different workspace', async () => {
    const crossWorkspaceSnapshot: ExpenseSnapshot = {
      expenseId,
      workspaceId: '99999999-9999-4999-a999-999999999999', // Different workspace
      userId: requesterId,
      amount: 100,
      currency: 'USD',
      hasReceipt: true,
      expenseDate: new Date(),
      status: 'SUBMITTED',
    };
    (mockSnapshotService.getExpenseSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue(crossWorkspaceSnapshot);

    const service = new WorkflowService(
      mockWorkflowRepo,
      mockChainRepo,
      mockAuthService,
      mockSnapshotService
    );

    await expect(
      service.initiateWorkflow({
        expenseId,
        workspaceId,
        userId: requesterId,
      })
    ).rejects.toBeInstanceOf(UnauthorizedWorkflowInitiationError);
  });

  it('should reject initiation if expense snapshot has mismatched expenseId', async () => {
    const mismatchedSnapshot: ExpenseSnapshot = {
      expenseId: '88888888-8888-4888-a888-888888888888',
      workspaceId,
      userId: requesterId,
      amount: 100,
      currency: 'USD',
      hasReceipt: true,
      expenseDate: new Date(),
      status: 'SUBMITTED',
    };
    (mockSnapshotService.getExpenseSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue(mismatchedSnapshot);

    const service = new WorkflowService(
      mockWorkflowRepo,
      mockChainRepo,
      mockAuthService,
      mockSnapshotService
    );

    await expect(
      service.initiateWorkflow({
        expenseId,
        workspaceId,
        userId: requesterId,
      })
    ).rejects.toBeInstanceOf(ExpenseSnapshotMismatchError);
  });

  it('should reject initiation if caller does not own the expense', async () => {
    const otherUserSnapshot: ExpenseSnapshot = {
      expenseId,
      workspaceId,
      userId: 'someone-else-uuid',
      amount: 100,
      currency: 'USD',
      hasReceipt: true,
      expenseDate: new Date(),
      status: 'SUBMITTED',
    };
    (mockSnapshotService.getExpenseSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue(otherUserSnapshot);

    const service = new WorkflowService(
      mockWorkflowRepo,
      mockChainRepo,
      mockAuthService,
      mockSnapshotService
    );

    await expect(
      service.initiateWorkflow({
        expenseId,
        workspaceId,
        userId: requesterId,
      })
    ).rejects.toBeInstanceOf(UnauthorizedWorkflowInitiationError);
  });

  it('should reject initiation if expense is not in SUBMITTED state (e.g. DRAFT, APPROVED, REJECTED)', async () => {
    const statuses = ['DRAFT', 'APPROVED', 'REJECTED', 'PENDING'];

    for (const invalidStatus of statuses) {
      const draftSnapshot: ExpenseSnapshot = {
        expenseId,
        workspaceId,
        userId: requesterId,
        amount: 100,
        currency: 'USD',
        hasReceipt: true,
        expenseDate: new Date(),
        status: invalidStatus,
      };
      (mockSnapshotService.getExpenseSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue(draftSnapshot);

      const service = new WorkflowService(
        mockWorkflowRepo,
        mockChainRepo,
        mockAuthService,
        mockSnapshotService
      );

      await expect(
        service.initiateWorkflow({
          expenseId,
          workspaceId,
          userId: requesterId,
        })
      ).rejects.toBeInstanceOf(ExpenseNotSubmittedError);
    }
  });
});

describe('HttpExpenseSnapshotAdapter (P1 Downstream Auth & Robustness)', () => {
  const originalEnv = process.env;
  let originalFetch: typeof globalThis.fetch;

  const workspaceId = '11111111-1111-4111-a111-111111111111';
  const expenseId = '22222222-2222-4222-a222-222222222222';
  const userId = '33333333-3333-4333-a333-333333333333';

  beforeEach(() => {
    process.env = { ...originalEnv, INTERNAL_API_KEY: 'test-internal-key' };
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  });

  it('should forward actor context headers (x-user-id, x-workspace-id, x-internal-api-key, authorization)', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            expenseId,
            workspaceId,
            userId,
            amount: '150.50',
            currency: 'USD',
            expenseDate: '2026-09-15T00:00:00.000Z',
            status: 'SUBMITTED',
            attachmentIds: ['att-uuid-1'],
          },
        }),
      };
    }) as unknown as typeof fetch;

    const adapter = new HttpExpenseSnapshotAdapter({
      expenseServiceUrl: 'http://expense-budgeting-service:3003',
    });

    const snapshot = await adapter.getExpenseSnapshot({
      workspaceId,
      expenseId,
      userId,
      authToken: 'test-token',
    });

    expect(capturedUrl).toBe(
      `http://expense-budgeting-service:3003/api/v1/workspaces/${workspaceId}/expenses/${expenseId}`
    );
    expect(capturedHeaders['x-user-id']).toBe(userId);
    expect(capturedHeaders['x-workspace-id']).toBe(workspaceId);
    expect(capturedHeaders['x-internal-api-key']).toBe('test-internal-key');
    expect(capturedHeaders['authorization']).toBe('Bearer test-token');

    expect(snapshot.expenseId).toBe(expenseId);
    expect(snapshot.amount).toBe(150.5);
    expect(snapshot.hasReceipt).toBe(true);
    expect(snapshot.status).toBe('SUBMITTED');
  });

  it('should accurately detect receipts from ExpenseDTO attachmentIds', async () => {
    // Case 1: attachmentIds has elements -> hasReceipt: true
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          expenseId,
          workspaceId,
          userId,
          amount: 200,
          currency: 'USD',
          expenseDate: '2026-09-15T00:00:00.000Z',
          status: 'SUBMITTED',
          attachmentIds: ['receipt-file-uuid'],
        },
      }),
    }) as unknown as typeof fetch;

    const adapter = new HttpExpenseSnapshotAdapter();
    const withReceipt = await adapter.getExpenseSnapshot({
      workspaceId,
      expenseId,
      userId,
    });
    expect(withReceipt.hasReceipt).toBe(true);

    // Case 2: attachmentIds is empty -> hasReceipt: false
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          expenseId,
          workspaceId,
          userId,
          amount: 200,
          currency: 'USD',
          expenseDate: '2026-09-15T00:00:00.000Z',
          status: 'SUBMITTED',
          attachmentIds: [],
        },
      }),
    }) as unknown as typeof fetch;

    const withoutReceipt = await adapter.getExpenseSnapshot({
      workspaceId,
      expenseId,
      userId,
    });
    expect(withoutReceipt.hasReceipt).toBe(false);
  });

  it('should reject malformed, zero, or negative amounts instead of defaulting to 0 (fail-closed)', async () => {
    const badAmounts = [0, -50, 'not-a-number', null, undefined, NaN];

    for (const badAmount of badAmounts) {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            expenseId,
            workspaceId,
            userId,
            amount: badAmount,
            status: 'SUBMITTED',
            attachmentIds: [],
          },
        }),
      }) as unknown as typeof fetch;

      const adapter = new HttpExpenseSnapshotAdapter();
      await expect(
        adapter.getExpenseSnapshot({
          workspaceId,
          expenseId,
          userId,
        })
      ).rejects.toThrow(/invalid or non-positive amount/);
    }
  });

  it('should reject responses with missing required fields (userId, status, expenseId mismatch)', async () => {
    // Missing userId
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          expenseId,
          workspaceId,
          amount: 100,
          status: 'SUBMITTED',
        },
      }),
    }) as unknown as typeof fetch;

    const adapter = new HttpExpenseSnapshotAdapter();
    await expect(
      adapter.getExpenseSnapshot({
        workspaceId,
        expenseId,
        userId,
      })
    ).rejects.toThrow(/missing or invalid owner userId/);
  });

  it('[P2] should reject malformed or non-ISO currency codes and normalize valid lowercase codes', async () => {
    const badCurrencies = ['USDX', 'US', '123', '   ', '', null, undefined, '$$$'];

    for (const badCurrency of badCurrencies) {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            expenseId,
            workspaceId,
            userId,
            amount: 100,
            currency: badCurrency,
            expenseDate: '2026-09-15T00:00:00.000Z',
            status: 'SUBMITTED',
            attachmentIds: [],
          },
        }),
      }) as unknown as typeof fetch;

      const adapter = new HttpExpenseSnapshotAdapter();
      await expect(
        adapter.getExpenseSnapshot({
          workspaceId,
          expenseId,
          userId,
        })
      ).rejects.toThrow(/missing or invalid currency|invalid currency code/);
    }

    // Valid lowercase currency must be normalized to uppercase ISO code
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          expenseId,
          workspaceId,
          userId,
          amount: 100,
          currency: '  eur  ',
          expenseDate: '2026-09-15T00:00:00.000Z',
          status: 'SUBMITTED',
          attachmentIds: [],
        },
      }),
    }) as unknown as typeof fetch;

    const adapter = new HttpExpenseSnapshotAdapter();
    const snapshot = await adapter.getExpenseSnapshot({
      workspaceId,
      expenseId,
      userId,
    });
    expect(snapshot.currency).toBe('EUR');
  });

  it('should reject malformed or non-object response body from expense service', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => 'not-an-object',
    }) as unknown as typeof fetch;

    const adapter = new HttpExpenseSnapshotAdapter();
    await expect(
      adapter.getExpenseSnapshot({
        workspaceId,
        expenseId,
        userId,
      })
    ).rejects.toThrow(/empty or invalid response body/);
  });
});
