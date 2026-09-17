import { describe, it, expect, vi } from 'vitest';
import { PrismaApprovalChainRepository } from '../infrastructure/persistence/approval-chain.repository.impl';
import { WorkspaceId, CategoryId } from '@core/domain/value-objects';

describe('Approval Chain Specificity & Precedence Resolution (P2)', () => {
  const workspaceId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  const categoryId = 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb';
  const approverId = 'cccccccc-cccc-4ccc-accc-cccccccccccc';

  const mockEventBus = {
    publish: vi.fn(),
    publishAll: vi.fn().mockResolvedValue(undefined),
  } as any;

  const createMockChainRow = (overrides: Partial<any> = {}) => ({
    id: '11111111-1111-4111-a111-111111111111',
    workspaceId,
    name: 'Test Chain',
    description: null,
    minAmount: null,
    maxAmount: null,
    categoryIds: [],
    requiresReceipt: false,
    approverSequence: [approverId],
    isActive: true,
    version: 1,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

  it('should select category-specific chain over an older catch-all chain', async () => {
    // Catch-all created Day 1
    const catchAllRow = createMockChainRow({
      id: '11111111-1111-4111-a111-111111111111',
      name: 'Default Catch-All',
      categoryIds: [],
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    // Specific category chain created Day 10
    const categorySpecificRow = createMockChainRow({
      id: '22222222-2222-4222-a222-222222222222',
      name: 'Category Specific',
      categoryIds: [categoryId],
      createdAt: new Date('2026-01-10T00:00:00Z'),
    });

    const mockPrisma = {
      approvalChain: {
        findMany: vi.fn().mockResolvedValue([catchAllRow, categorySpecificRow]),
      },
    } as any;

    const repository = new PrismaApprovalChainRepository(mockPrisma, mockEventBus);

    const result = await repository.findApplicableChain({
      workspaceId: WorkspaceId.fromString(workspaceId),
      amount: 250,
      categoryId: CategoryId.fromString(categoryId),
      hasReceipt: true,
    });

    expect(result).not.toBeNull();
    // Must select the category specific chain (score 100) instead of older catch-all (score 0)
    expect(result!.id.getValue()).toBe('22222222-2222-4222-a222-222222222222');
    expect(result!.name).toBe('Category Specific');
  });

  it('should select stricter chain requiring receipt over a generic chain when receipt is provided', async () => {
    const genericRow = createMockChainRow({
      id: '11111111-1111-4111-a111-111111111111',
      name: 'Generic Chain',
      requiresReceipt: false,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    const receiptSpecificRow = createMockChainRow({
      id: '33333333-3333-4333-a333-333333333333',
      name: 'Receipt Required Chain',
      requiresReceipt: true,
      createdAt: new Date('2026-01-02T00:00:00Z'),
    });

    const mockPrisma = {
      approvalChain: {
        findMany: vi.fn().mockResolvedValue([genericRow, receiptSpecificRow]),
      },
    } as any;

    const repository = new PrismaApprovalChainRepository(mockPrisma, mockEventBus);

    const result = await repository.findApplicableChain({
      workspaceId: WorkspaceId.fromString(workspaceId),
      amount: 250,
      hasReceipt: true,
    });

    expect(result).not.toBeNull();
    expect(result!.id.getValue()).toBe('33333333-3333-4333-a333-333333333333');
    expect(result!.name).toBe('Receipt Required Chain');
  });

  it('should select newer chain when two chains have equal specificity', async () => {
    const olderRow = createMockChainRow({
      id: '11111111-1111-4111-a111-111111111111',
      name: 'Older Policy',
      categoryIds: [categoryId],
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    const newerRow = createMockChainRow({
      id: '44444444-4444-4444-a444-444444444444',
      name: 'Newer Updated Policy',
      categoryIds: [categoryId],
      createdAt: new Date('2026-02-01T00:00:00Z'), // 1 month newer
    });

    const mockPrisma = {
      approvalChain: {
        findMany: vi.fn().mockResolvedValue([olderRow, newerRow]),
      },
    } as any;

    const repository = new PrismaApprovalChainRepository(mockPrisma, mockEventBus);

    const result = await repository.findApplicableChain({
      workspaceId: WorkspaceId.fromString(workspaceId),
      amount: 100,
      categoryId: CategoryId.fromString(categoryId),
      hasReceipt: true,
    });

    expect(result).not.toBeNull();
    // Newer policy supersedes older policy of equal criteria
    expect(result!.id.getValue()).toBe('44444444-4444-4444-a444-444444444444');
    expect(result!.name).toBe('Newer Updated Policy');
  });
});
