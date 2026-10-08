import { describe, expect, it, vi } from 'vitest';
import { PrismaRepositoryHelper as ExpensePagination } from '../../apps/expense-budgeting-service/src/shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepositoryHelper as ReceiptPagination } from '../../apps/receipt-vault-service/src/shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepositoryHelper as AuditPagination } from '../../apps/audit-compliance-service/src/shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepositoryHelper as BankPagination } from '../../apps/bank-feed-service/src/shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepositoryHelper as NotificationPagination } from '../../apps/notification-service/src/shared/infrastructure/persistence/prisma-repository.helper';

describe.each([
  ['Expense', ExpensePagination],
    ['Receipt', ReceiptPagination],
    ['Audit', AuditPagination],
    ['Bank', BankPagination],
    ['Notification', NotificationPagination],
] as const)('%s pagination', (_name, helper) => {
  it('preserves page bounds, mapping, totals, and the remaining-page flag', async () => {
    const read = vi.fn().mockResolvedValue([{ id: 'first' }, { id: 'second' }]);
    const result = await helper.paginate<{ id: string }, string>(
      read,
      async () => 10,
      (row) => row.id,
      { limit: 2, offset: 4 }
    );
    expect(read).toHaveBeenCalledWith({ take: 2, skip: 4 });
    expect(result).toEqual({
      items: ['first', 'second'],
      total: 10,
      limit: 2,
      offset: 4,
      hasMore: true,
    });
  });

  it('caps page size and reports the last page correctly', async () => {
    const read = vi.fn().mockResolvedValue([]);
    expect(
      await helper.paginate(
        read,
        async () => 0,
        (row) => row,
        { limit: 500, offset: 0 }
      )
    ).toMatchObject({ limit: 100, hasMore: false });
    expect(read).toHaveBeenCalledWith({ take: 100, skip: 0 });
  });

  it.each([
    { limit: 0 },
    { limit: NaN },
    { limit: Infinity },
    { limit: 1.5 },
    { offset: -1 },
    { offset: Infinity },
    { offset: 2_147_483_648 },
  ])('rejects invalid bounds before database access: %j', async (options) => {
    const read = vi.fn();
    const count = vi.fn();
    await expect(
      helper.paginate(read, count, (row) => row, options)
    ).rejects.toThrow(RangeError);
    expect(read).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
  });
});
