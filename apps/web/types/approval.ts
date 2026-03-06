import { ApprovalStatus, WorkflowStatus } from './enums';
import { Expense } from './expense';

// ============================================================================
// Approval Workflow Types - Matching Backend Prisma Schema
// ============================================================================

export interface ApprovalChain {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  minAmount: string | null; // Decimal
  maxAmount: string | null; // Decimal
  categoryIds: string[];
  requiresReceipt: boolean;
  approverSequence: string[]; // Array of user IDs
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseWorkflow {
  id: string;
  expenseId: string;
  workspaceId: string;
  userId: string;
  chainId: string;
  status: WorkflowStatus;
  currentStepNumber: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  // Relations
  steps?: ApprovalStep[];
  chain?: ApprovalChain;
  expense?: Expense;
}

export interface ApprovalStep {
  id: string;
  workflowId: string;
  stepNumber: number;
  approverId: string;
  delegatedTo: string | null;
  status: ApprovalStatus;
  comments: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Additional fields for UI
  approverName?: string;
  approverEmail?: string;
  approverAvatar?: string;
  delegatedToName?: string;
}

// ============================================================================
// Pending Approval (for approvers list view)
// ============================================================================

export interface PendingApproval {
  workflowId: string;
  expenseId: string;
  stepId: string;
  stepNumber: number;
  currentStepNumber: number;
  totalSteps: number;
  // Expense details
  expenseTitle: string;
  expenseAmount: string;
  expenseCurrency: string;
  expenseDate: string;
  expenseDescription: string | null;
  merchant: string | null;
  category: string | null;
  // Submitter details
  submitterUserId: string;
  submitterName: string;
  submitterEmail: string;
  submitterAvatar?: string;
  // Project/Team context (if available)
  project?: string;
  team?: string;
  // Workflow details
  workflowStatus: WorkflowStatus;
  submittedAt: string;
  // Current user's step status
  myStepStatus: ApprovalStatus;
}

// ============================================================================
// Approval DTOs
// ============================================================================

export interface InitiateWorkflowDTO {
  expenseId: string;
  amount: number;
  categoryId?: string;
  hasReceipt: boolean;
}

export interface ApproveStepDTO {
  comments?: string;
}

export interface RejectStepDTO {
  comments: string; // Required for rejection
}

export interface DelegateStepDTO {
  toUserId: string;
}

// ============================================================================
// Approval Chain DTOs
// ============================================================================

export interface CreateApprovalChainDTO {
  name: string;
  description?: string;
  minAmount?: number;
  maxAmount?: number;
  categoryIds: string[];
  requiresReceipt: boolean;
  approverSequence: string[];
}

export interface UpdateApprovalChainDTO {
  name?: string;
  description?: string;
  minAmount?: number;
  maxAmount?: number;
  categoryIds?: string[];
  requiresReceipt?: boolean;
  approverSequence?: string[];
  isActive?: boolean;
}
