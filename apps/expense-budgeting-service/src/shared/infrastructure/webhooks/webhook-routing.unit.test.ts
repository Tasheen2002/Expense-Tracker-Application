import { describe, expect, it } from 'vitest';
import { EXPENSE_EVENTS } from '../../../shared/events/expense-events';
import { BUDGET_PLAN_EVENTS } from '../../../modules/budget-planning/domain/constants/planning.constants';
import {
  DepartmentCreatedEvent, DepartmentUpdatedEvent, DepartmentActivatedEvent, DepartmentDeactivatedEvent,
} from '../../../modules/cost-allocation/domain/entities/department.entity';
import {
  CostCenterCreatedEvent, CostCenterUpdatedEvent, CostCenterActivatedEvent, CostCenterDeactivatedEvent,
} from '../../../modules/cost-allocation/domain/entities/cost-center.entity';
import {
  ProjectCreatedEvent, ProjectUpdatedEvent, ProjectActivatedEvent, ProjectDeactivatedEvent,
} from '../../../modules/cost-allocation/domain/entities/project.entity';
import {
  ExpenseAllocationCreatedEvent, ExpenseAllocationDeletedEvent, ExpenseAllocationsReplacedEvent,
} from '../../../modules/cost-allocation/domain/entities/expense-allocation.entity';
import { buildWebhookRoutes } from './webhook-routing';
import { Expense } from '../../../modules/expense-ledger/domain/entities/expense.entity';
import { Money } from '../../../modules/expense-ledger/domain/value-objects/money';
import { ExpenseDate } from '../../../modules/expense-ledger/domain/value-objects/expense-date';
import { PaymentMethod } from '../../../modules/expense-ledger/domain/enums/payment-method';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

describe('expense-budgeting outbox routing', () => {
  it('keeps every automatically recoverable historical contract audit-only', () => {
    const { contracts }: { contracts: Record<string, readonly string[]> } = createRequire(__filename)('../../../../../../scripts/lib/outbox-recovery-policy.cjs');
    const audit = 'http://audit:3009/api/v1/event-outbox/events';
    const routes = buildWebhookRoutes({ auditServiceUrl: 'http://audit:3009', notificationServiceUrl: 'http://notification:3008' });
    for (const type of Object.keys(contracts)) expect(routes[type], type).toEqual([audit]);
  });
  it.each(['approve', 'reject'] as const)('routes exactly one owner-bearing notification event for %s', (action) => {
    const owner = randomUUID();
    const actor = randomUUID();
    const workspace = randomUUID();
    const expense = Expense.create({ workspaceId: workspace, userId: owner, title: 'Lunch',
      amount: Money.create(50, 'USD'), expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.CASH, isReimbursable: false, tagIds: [], attachmentIds: [] });
    expense.submit(owner);
    const before = expense.domainEvents.length;
    expense[action](actor);
    const events = expense.domainEvents.slice(before);
    const audit = 'http://audit:3009/api/v1/event-outbox/events';
    const notification = 'http://notification:3008/api/v1/event-outbox/events';
    const routes = buildWebhookRoutes({ auditServiceUrl: 'http://audit:3009', notificationServiceUrl: 'http://notification:3008' });
    expect(events).toHaveLength(2);
    expect(events.every(event => routes[event.eventType].includes(audit))).toBe(true);
    const notificationEvents = events.filter(event => routes[event.eventType].includes(notification));
    expect(notificationEvents).toHaveLength(1);
    expect(notificationEvents[0].getPayload()).toMatchObject({ workspaceId: workspace, expenseOwnerId: owner, changedBy: actor });
  });
  it('delivers legacy creation and deletion events only to audit without routing unknown events', () => {
    const audit = 'http://audit:3009/api/v1/event-outbox/events';
    const routes = buildWebhookRoutes({
      auditServiceUrl: 'http://audit:3009',
      notificationServiceUrl: 'http://notification:3008',
    });
    for (const type of ['BudgetPlanCreated', 'BudgetPlanUpdated', 'BudgetPlanStatusChanged', 'DepartmentDeleted', 'CostCenterDeleted', 'ProjectDeleted']) {
      expect(routes[type]).toEqual([audit]);
    }
    expect(routes['UnrecognizedHistoricalEvent']).toBeUndefined();
  });
  it('covers expense, planning, and cost-allocation domain events', () => {
    const audit = 'http://audit:3009/api/v1/event-outbox/events';
    const notification = 'http://notification:3008/api/v1/event-outbox/events';
    const routes = buildWebhookRoutes({
      auditServiceUrl: 'http://audit:3009',
      notificationServiceUrl: 'http://notification:3008',
    });
    const allocationTypes = [
      DepartmentCreatedEvent, DepartmentUpdatedEvent, DepartmentActivatedEvent, DepartmentDeactivatedEvent,
      CostCenterCreatedEvent, CostCenterUpdatedEvent, CostCenterActivatedEvent, CostCenterDeactivatedEvent,
      ProjectCreatedEvent, ProjectUpdatedEvent, ProjectActivatedEvent, ProjectDeactivatedEvent,
      ExpenseAllocationCreatedEvent, ExpenseAllocationDeletedEvent, ExpenseAllocationsReplacedEvent,
    ].map((eventClass) => eventClass.prototype.eventType);

    for (const type of [
      ...Object.values(EXPENSE_EVENTS),
      ...Object.values(BUDGET_PLAN_EVENTS),
      ...allocationTypes,
      'budget.created', 'supplier.created', 'purchase_order.item_received',
    ]) {
      expect(routes[type], `Missing subscriber for ${type}`).toContain(audit);
    }
    expect(routes[EXPENSE_EVENTS.EXPENSE_APPROVED]).toEqual([audit]);
    expect(routes[EXPENSE_EVENTS.EXPENSE_REJECTED]).toEqual([audit]);
    expect(routes[EXPENSE_EVENTS.EXPENSE_STATUS_CHANGED]).toEqual([audit, notification]);
    expect(routes['budget.threshold_exceeded']).toEqual([audit, notification]);
    expect(routes['ExpenseApproved']).toEqual([audit]);
    expect(routes['ExpenseRejected']).toEqual([audit]);
  });
});
