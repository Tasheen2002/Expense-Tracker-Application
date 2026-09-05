import { DomainEvent, DomainEventHandler } from '@core/domain/events/domain-event';
import { NotificationService } from '../services/notification.service';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import { NotificationPriority } from '../../domain/enums/notification-priority.enum';

// Local event shape interfaces — decoupled from other module internals
interface ExpenseStatusChangedPayload extends DomainEvent {
  expenseId: string;
  workspaceId: string;
  expenseOwnerId: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
}

interface BudgetThresholdExceededPayload extends DomainEvent {
  budgetId: string;
  workspaceId: string;
}

interface ApprovalWorkflowStartedPayload extends DomainEvent {
  workflowId: string;
  workspaceId: string;
  requesterId: string;
  expenseId: string;
}

export class NotificationEventHandler {
  constructor(private readonly notificationService: NotificationService) {}

  public handleExpenseStatusChanged: DomainEventHandler<ExpenseStatusChangedPayload> =
    {
      eventType: 'expense.status_changed',
      handle: async (event: ExpenseStatusChangedPayload): Promise<void> => {
        const type = this.mapStatusToNotificationType(event.newStatus);
        if (!type) return;

        await this.notificationService.send({
          workspaceId: event.workspaceId,
          recipientId: event.expenseOwnerId,
          type,
          priority: NotificationPriority.MEDIUM,
          data: {
            expenseId: event.expenseId,
            oldStatus: event.oldStatus,
            newStatus: event.newStatus,
            changedBy: event.changedBy,
          },
        });
      },
    };

  public handleBudgetExceeded: DomainEventHandler<BudgetThresholdExceededPayload> =
    {
      eventType: 'budget.threshold_exceeded',
      handle: async (event: BudgetThresholdExceededPayload): Promise<void> => {
        console.warn(
          `[Notification] Budget ${event.budgetId} exceeded threshold. Notification skipped (recipient unknown).`,
        );
      },
    };

  public handleApprovalStarted: DomainEventHandler<ApprovalWorkflowStartedPayload> =
    {
      eventType: 'approval.workflow_started',
      handle: async (event: ApprovalWorkflowStartedPayload): Promise<void> => {
        await this.notificationService.send({
          workspaceId: event.workspaceId,
          recipientId: event.requesterId,
          type: NotificationType.SYSTEM_ALERT,
          priority: NotificationPriority.MEDIUM,
          data: {
            message: `Approval workflow started for your expense id: ${event.expenseId}`,
            workflowId: event.workflowId,
          },
        });
      },
    };

  private mapStatusToNotificationType(status: string): NotificationType | null {
    switch (status) {
      case 'APPROVED':
        return NotificationType.EXPENSE_APPROVED;
      case 'REJECTED':
        return NotificationType.EXPENSE_REJECTED;
      default:
        return null;
    }
  }
}
