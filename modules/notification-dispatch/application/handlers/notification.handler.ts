import { DomainEventHandler } from "../../../../apps/api/src/shared/domain/events/domain-event";
import { ExpenseStatusChangedEvent } from "../../../expense-ledger/domain/entities/expense.entity";
import { BudgetThresholdExceededEvent } from "../../../budget-management/domain/entities/budget.entity";
import { ApprovalWorkflowStartedEvent } from "../../../approval-workflow/domain/entities/expense-workflow.entity";
import { UserCreatedEvent } from "../../../identity-workspace/domain/entities/user.entity";
import { NotificationService } from "../services/notification.service";
import { NotificationType } from "../../domain/enums/notification-type.enum";
import { NotificationPriority } from "../../domain/enums/notification-priority.enum";

export class NotificationEventHandler {
  constructor(private readonly notificationService: NotificationService) {}

  public handleExpenseStatusChanged: DomainEventHandler<ExpenseStatusChangedEvent> =
    {
      eventType: "expense.status_changed",
      handle: async (event: ExpenseStatusChangedEvent): Promise<void> => {
        // Only notify on relevant status changes (Approved/Rejected)
        const type = this.mapStatusToNotificationType(event.newStatus);
        if (!type) return;

        await this.notificationService.send({
          workspaceId: event.workspaceId,
          recipientId: event.expenseOwnerId, // Notify the expense owner
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

  public handleBudgetExceeded: DomainEventHandler<BudgetThresholdExceededEvent> =
    {
      eventType: "budget.threshold_exceeded",
      handle: async (event: BudgetThresholdExceededEvent): Promise<void> => {
        console.warn(
          `[Notification] Budget ${event.budgetId} exceeded threshold. Notification skipped (recipient unknown).`,
        );
      },
    };

  public handleApprovalStarted: DomainEventHandler<ApprovalWorkflowStartedEvent> =
    {
      eventType: "approval.workflow_started",
      handle: async (event: ApprovalWorkflowStartedEvent): Promise<void> => {
        await this.notificationService.send({
          workspaceId: event.workspaceId,
          recipientId: event.requesterId,
          type: NotificationType.SYSTEM_ALERT, // Generic alert for now
          priority: NotificationPriority.MEDIUM,
          data: {
            message: `Approval workflow started for your expense id: ${event.expenseId}`,
            workflowId: event.workflowId,
          },
        });
      },
    };

  public handleUserCreated: DomainEventHandler<UserCreatedEvent> = {
    eventType: "UserCreated",
    handle: async (event: UserCreatedEvent): Promise<void> => {
      await this.notificationService.send({
        workspaceId: "system", // System notifications might need a special workspace or null
        recipientId: event.userId,
        type: NotificationType.SYSTEM_ALERT,
        priority: NotificationPriority.HIGH,
        title: "Welcome to Expense Tracker",
        content: `Welcome ${event.fullName || event.email}! Your account has been created successfully.`,
        data: {
          email: event.email,
        },
      });
    },
  };

  private mapStatusToNotificationType(status: string): NotificationType | null {
    switch (status) {
      case "APPROVED":
        return NotificationType.EXPENSE_APPROVED;
      case "REJECTED":
        return NotificationType.EXPENSE_REJECTED;
      default:
        return null;
    }
  }
}
