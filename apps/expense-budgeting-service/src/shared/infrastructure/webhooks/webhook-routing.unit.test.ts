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

describe('expense-budgeting outbox routing', () => {
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
    expect(routes[EXPENSE_EVENTS.EXPENSE_APPROVED]).toEqual([audit, notification]);
    expect(routes['budget.threshold_exceeded']).toEqual([audit, notification]);
    expect(routes['ExpenseApproved']).toEqual([audit, notification]);
  });
});
