import { z } from 'zod';

// ============================================================================
// Base Event Schema
// ============================================================================

export const BaseEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string(),
  timestamp: z.coerce.date(),
  workspaceId: z.string().uuid(),
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;

// ============================================================================
// Identity / Workspace Events
// ============================================================================

export const UserCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('UserCreated'),
  data: z.object({
    userId: z.string().uuid(),
    email: z.string().email(),
    fullName: z.string().nullable(),
  }),
});
export type UserCreatedEvent = z.infer<typeof UserCreatedEventSchema>;

export const WorkspaceCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('WorkspaceCreated'),
  data: z.object({
    ownerId: z.string().uuid(),
    name: z.string(),
  }),
});
export type WorkspaceCreatedEvent = z.infer<typeof WorkspaceCreatedEventSchema>;

export const MemberJoinedWorkspaceEventSchema = BaseEventSchema.extend({
  eventType: z.literal('MemberJoinedWorkspace'),
  data: z.object({
    userId: z.string().uuid(),
    role: z.string(),
  }),
});
export type MemberJoinedWorkspaceEvent = z.infer<typeof MemberJoinedWorkspaceEventSchema>;

export const MemberRoleChangedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('MemberRoleChanged'),
  data: z.object({
    userId: z.string().uuid(),
    oldRole: z.string(),
    newRole: z.string(),
  }),
});
export type MemberRoleChangedEvent = z.infer<typeof MemberRoleChangedEventSchema>;

// ============================================================================
// Expense Events
// ============================================================================

export const ExpenseCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('expense.created'),
  data: z.object({
    expenseId: z.string().uuid(),
    amount: z.number(),
    currency: z.string(),
    title: z.string(),
    categoryId: z.string().uuid().nullable(),
    userId: z.string().uuid(),
  }),
});
export type ExpenseCreatedEvent = z.infer<typeof ExpenseCreatedEventSchema>;

export const ExpenseSubmittedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('expense.submitted'),
  data: z.object({
    expenseId: z.string().uuid(),
    userId: z.string().uuid(),
  }),
});
export type ExpenseSubmittedEvent = z.infer<typeof ExpenseSubmittedEventSchema>;

export const ExpenseApprovedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('expense.approved'),
  data: z.object({
    expenseId: z.string().uuid(),
    approvedBy: z.string().uuid(),
  }),
});
export type ExpenseApprovedEvent = z.infer<typeof ExpenseApprovedEventSchema>;

export const ExpenseRejectedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('expense.rejected'),
  data: z.object({
    expenseId: z.string().uuid(),
    rejectedBy: z.string().uuid(),
    reason: z.string(),
  }),
});
export type ExpenseRejectedEvent = z.infer<typeof ExpenseRejectedEventSchema>;

// ============================================================================
// Budget Events
// ============================================================================

export const BudgetThresholdExceededEventSchema = BaseEventSchema.extend({
  eventType: z.literal('budget.threshold_exceeded'),
  data: z.object({
    budgetId: z.string().uuid(),
    threshold: z.number(),
    currentSpent: z.number(),
    allocatedAmount: z.number(),
  }),
});
export type BudgetThresholdExceededEvent = z.infer<typeof BudgetThresholdExceededEventSchema>;

export const BudgetUpdatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('budget.updated'),
  data: z.object({
    budgetId: z.string().uuid(),
    totalAmount: z.number(),
  }),
});
export type BudgetUpdatedEvent = z.infer<typeof BudgetUpdatedEventSchema>;

// ============================================================================
// Receipt Events
// ============================================================================

export const ReceiptUploadedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('receipt.uploaded'),
  data: z.object({
    receiptId: z.string().uuid(),
    fileName: z.string(),
    filePath: z.string(),
    fileSize: z.number(),
    userId: z.string().uuid(),
  }),
});
export type ReceiptUploadedEvent = z.infer<typeof ReceiptUploadedEventSchema>;

// ============================================================================
// Approval Workflow Events
// ============================================================================

export const ApprovalWorkflowStartedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('approval.workflow_started'),
  data: z.object({
    workflowId: z.string().uuid(),
    expenseId: z.string().uuid(),
  }),
});
export type ApprovalWorkflowStartedEvent = z.infer<typeof ApprovalWorkflowStartedEventSchema>;

export const ApprovalWorkflowCompletedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('approval.workflow_completed'),
  data: z.object({
    workflowId: z.string().uuid(),
    expenseId: z.string().uuid(),
  }),
});
export type ApprovalWorkflowCompletedEvent = z.infer<typeof ApprovalWorkflowCompletedEventSchema>;

export const ApprovalWorkflowRejectedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('approval.workflow_rejected'),
  data: z.object({
    workflowId: z.string().uuid(),
    expenseId: z.string().uuid(),
    reason: z.string(),
  }),
});
export type ApprovalWorkflowRejectedEvent = z.infer<typeof ApprovalWorkflowRejectedEventSchema>;
