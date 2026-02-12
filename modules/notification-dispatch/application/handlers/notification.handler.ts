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

        try {
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
        } catch (error) {
          console.error(
            `[NotificationHandler] NOTIFICATION_FAILED: Failed to send expense status notification for expense ${event.expenseId}:`,
            error instanceof Error ? error.message : error,
          );
        }
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
        try {
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
        } catch (error) {
          console.error(
            `[NotificationHandler] NOTIFICATION_FAILED: Failed to send approval workflow notification for expense ${event.expenseId}:`,
            error instanceof Error ? error.message : error,
          );
        }
      },
    };

  public handleUserCreated: DomainEventHandler<UserCreatedEvent> = {
    eventType: "UserCreated",
    handle: async (event: UserCreatedEvent): Promise<void> => {
      // Skip welcome notification for now - users don't have a workspace at creation time
      // TODO: Implement email-based welcome notification or send after workspace creation
      console.debug(
        `[Notification] UserCreated event for ${event.email} - skipping in-app notification (no workspace context)`,
      );
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
