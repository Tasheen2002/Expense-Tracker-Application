import { randomUUID } from 'crypto';
import { describe, expect, it } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { Budget } from '../domain/entities/budget.entity';
import { BudgetAllocation } from '../domain/entities/budget-allocation.entity';
import { BudgetAlert } from '../domain/entities/budget-alert.entity';
import { SpendingLimit } from '../domain/entities/spending-limit.entity';
import { BudgetPeriodType } from '../domain/enums/budget-period-type';
import { AlertLevel } from '../domain/enums/alert-level';
import {
  InvalidAmountError,
  InvalidBudgetDataError,
  InvalidBudgetPeriodError,
  InvalidCurrencyError,
} from '../domain/errors/budget.errors';

const budgetData = () => ({
  workspaceId: randomUUID(),
  name: ' Travel ',
  totalAmount: 100,
  currency: 'usd',
  periodType: BudgetPeriodType.MONTHLY,
  startDate: new Date('2026-09-01'),
  createdBy: randomUUID(),
});

describe('budget-management entity invariants', () => {
  it('normalizes budget text and currency and rejects invalid updates', () => {
    const budget = Budget.create(budgetData());
    expect(budget.name).toBe('Travel');
    expect(budget.currency).toBe('USD');
    expect(() => budget.updateName('x'.repeat(256))).toThrow(InvalidBudgetDataError);
    expect(() => budget.updateDescription('x'.repeat(5001))).toThrow(InvalidBudgetDataError);
    expect(() => Budget.create({ ...budgetData(), currency: '$$$' }))
      .toThrow(InvalidCurrencyError);
  });

  it('rejects non-finite, imprecise, and unrepresentable money', () => {
    for (const amount of [NaN, Infinity, '1000000000', '1.001']) {
      expect(() => Budget.create({ ...budgetData(), totalAmount: amount }))
        .toThrow(InvalidAmountError);
    }
    const budget = Budget.create(budgetData());
    expect(() => budget.updateTotalAmount(new Decimal(NaN))).toThrow(InvalidAmountError);

    const allocation = BudgetAllocation.create({
      budgetId: budget.id.getValue(),
      allocatedAmount: 50,
    });
    expect(() => allocation.incrementSpent('0.001')).toThrow(InvalidAmountError);
    expect(() => allocation.updateSpentAmount('10000000000')).toThrow(InvalidAmountError);
    expect(() => allocation.updateDescription('x'.repeat(501)))
      .toThrow(InvalidBudgetDataError);

    expect(() => SpendingLimit.create({
      workspaceId: budget.workspaceId,
      limitAmount: Infinity,
      currency: 'USD',
      periodType: BudgetPeriodType.MONTHLY,
    })).toThrow(InvalidAmountError);
  });

  it('only marks a budget exceeded when spending exceeds its total', () => {
    const budget = Budget.create(budgetData());
    budget.activate();
    expect(() => budget.markAsExceeded(99)).toThrow(InvalidAmountError);
    expect(() => budget.markAsExceeded(100)).toThrow(InvalidAmountError);
    expect(budget.isExceeded()).toBe(false);
    budget.markAsExceeded(101);
    expect(budget.isExceeded()).toBe(true);
  });

  it('emits allocation alerts only when a threshold level is crossed', () => {
    const allocation = BudgetAllocation.create({
      budgetId: randomUUID(),
      allocatedAmount: 100,
    });
    allocation.updateSpentAmount(60);
    expect(allocation.collectTriggeredAlerts()[0].level).toBe(AlertLevel.INFO);
    expect(allocation.collectTriggeredAlerts()).toEqual([]);
    allocation.updateSpentAmount(70);
    expect(allocation.collectTriggeredAlerts()).toEqual([]);
    allocation.updateSpentAmount(80);
    expect(allocation.collectTriggeredAlerts()[0].level).toBe(AlertLevel.WARNING);
  });

  it('stores a representable alert threshold when spending greatly exceeds allocation', () => {
    const alert = BudgetAlert.create({
      budgetId: randomUUID(),
      currentSpent: 1000,
      allocatedAmount: 1,
    });
    expect(alert.level).toBe(AlertLevel.EXCEEDED);
    expect(alert.threshold.toString()).toBe('100');
    expect(() => BudgetAlert.create({
      budgetId: randomUUID(),
      currentSpent: -10,
      allocatedAmount: 100,
    })).toThrow(InvalidAmountError);
  });

  it('requires every spending-limit target to match and a supported period', () => {
    const userId = randomUUID();
    const categoryId = randomUUID();
    const limit = SpendingLimit.create({
      workspaceId: randomUUID(),
      userId,
      categoryId,
      limitAmount: 100,
      currency: 'usd',
      periodType: BudgetPeriodType.MONTHLY,
    });
    expect(limit.appliesTo(userId, categoryId)).toBe(true);
    expect(limit.appliesTo(undefined, categoryId)).toBe(false);
    expect(limit.appliesTo(userId, undefined)).toBe(false);
    expect(limit.appliesTo(randomUUID(), categoryId)).toBe(false);
    expect(limit.currency).toBe('USD');
    expect(() => SpendingLimit.create({
      workspaceId: randomUUID(),
      limitAmount: 100,
      currency: 'USD',
      periodType: BudgetPeriodType.CUSTOM,
    })).toThrow(InvalidBudgetPeriodError);
  });

  it('rejects invalid IDs instead of widening spending-limit or allocation scope', () => {
    expect(() => Budget.create({ ...budgetData(), workspaceId: '' }))
      .toThrow(InvalidBudgetDataError);
    expect(() => Budget.create({ ...budgetData(), createdBy: 'user-123' }))
      .toThrow(InvalidBudgetDataError);
    for (const field of ['userId', 'categoryId'] as const) {
      expect(() => SpendingLimit.create({
        workspaceId: randomUUID(),
        [field]: '',
        limitAmount: 100,
        currency: 'USD',
        periodType: BudgetPeriodType.MONTHLY,
      })).toThrow(InvalidBudgetDataError);
    }
    expect(() => BudgetAllocation.create({
      budgetId: randomUUID(), categoryId: '', allocatedAmount: 50,
    })).toThrow(InvalidBudgetDataError);
  });

  it('does not advance timestamps or emit events for unchanged updates', () => {
    const budget = Budget.create(budgetData());
    const budgetUpdatedAt = budget.updatedAt.getTime();
    const budgetEventCount = budget.domainEvents.length;
    budget.updateName('Travel');
    budget.updateTotalAmount(100);
    budget.updateDescription(null);
    expect(budget.updatedAt.getTime()).toBe(budgetUpdatedAt);
    expect(budget.domainEvents).toHaveLength(budgetEventCount);

    const limit = SpendingLimit.create({
      workspaceId: randomUUID(),
      limitAmount: 100,
      currency: 'USD',
      periodType: BudgetPeriodType.MONTHLY,
    });
    const limitUpdatedAt = limit.updatedAt.getTime();
    const limitEventCount = limit.domainEvents.length;
    limit.updateLimitAmount(100);
    expect(limit.updatedAt.getTime()).toBe(limitUpdatedAt);
    expect(limit.domainEvents).toHaveLength(limitEventCount);
  });

  it('does not expose mutable timestamps', () => {
    const budget = Budget.create(budgetData());
    const originalYear = budget.createdAt.getUTCFullYear();
    budget.createdAt.setUTCFullYear(2000);
    expect(budget.createdAt.getUTCFullYear()).toBe(originalYear);

    const allocation = BudgetAllocation.create({
      budgetId: budget.id.getValue(),
      allocatedAmount: 50,
    });
    const originalAllocationYear = allocation.updatedAt.getUTCFullYear();
    allocation.updatedAt.setUTCFullYear(2000);
    expect(allocation.updatedAt.getUTCFullYear()).toBe(originalAllocationYear);
  });
});
