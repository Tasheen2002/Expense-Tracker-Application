import { PaymentMethod, ExpenseStatus } from './enums';

// ============================================================================
// Expense Types - Matching Backend Prisma Schema
// ============================================================================

export interface Expense {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  description: string | null;
  amount: string; // Decimal from backend comes as string
  currency: string;
  expenseDate: string; // ISO date string
  categoryId: string | null;
  merchant: string | null;
  paymentMethod: PaymentMethod;
  isReimbursable: boolean;
  status: ExpenseStatus;
  createdAt: string;
  updatedAt: string;
  // Relations (optional - populated when needed)
  category?: Category;
  tags?: Tag[];
  attachments?: Attachment[];
}

export interface Category {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  workspaceId: string;
  name: string;
  color: string | null;
  createdAt: string;
}

export interface Attachment {
  id: string;
  expenseId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
}

// ============================================================================
// Expense DTOs (Data Transfer Objects)
// ============================================================================

export interface CreateExpenseDTO {
  title: string;
  description?: string;
  amount: number;
  currency: string;
  expenseDate: string; // ISO date string
  categoryId?: string;
  merchant?: string;
  paymentMethod: PaymentMethod;
  isReimbursable: boolean;
  tagIds?: string[];
}

export interface UpdateExpenseDTO {
  title?: string;
  description?: string;
  amount?: number;
  currency?: string;
  expenseDate?: string;
  categoryId?: string;
  merchant?: string;
  paymentMethod?: PaymentMethod;
  isReimbursable?: boolean;
}

export interface FilterExpensesDTO {
  userId?: string;
  categoryId?: string;
  status?: ExpenseStatus;
  paymentMethod?: PaymentMethod;
  isReimbursable?: boolean;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
  searchText?: string;
  limit?: number;
  offset?: number;
}

export interface ExpenseStatistics {
  totalExpenses: number;
  totalAmount: string;
  currency: string;
  statusBreakdown: {
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
    reimbursed: number;
  };
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
    totalAmount: string;
  }>;
  paymentMethodBreakdown: Array<{
    paymentMethod: PaymentMethod;
    count: number;
    totalAmount: string;
  }>;
  monthlyTrend: Array<{
    month: string;
    count: number;
    totalAmount: string;
  }>;
}

// ============================================================================
// Category DTOs
// ============================================================================

export interface CreateCategoryDTO {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryDTO {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

// ============================================================================
// Tag DTOs
// ============================================================================

export interface CreateTagDTO {
  name: string;
  color?: string;
}

export interface UpdateTagDTO {
  name?: string;
  color?: string;
}
