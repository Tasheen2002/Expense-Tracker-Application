import { Expense } from "../entities/expense.entity";
import { ExpenseId } from "../value-objects/expense-id";
import { CategoryId } from "../value-objects/category-id";
import { ExpenseStatus } from "../enums/expense-status";
import { PaymentMethod } from "../enums/payment-method";

import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
export { PaginatedResult, PaginationOptions };

export interface ExpenseFilters {
  workspaceId: string;
  userId?: string;
  categoryId?: string;
  status?: ExpenseStatus;
  paymentMethod?: PaymentMethod;
  isReimbursable?: boolean;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
  searchText?: string;
  // Pagination options
  pagination?: PaginationOptions;
}

export interface ExpenseRepository {
  /**
   * Save a new expense
   */
  save(expense: Expense): Promise<void>;

  /**
   * Update an existing expense
   */
  update(expense: Expense): Promise<void>;

  /**
   * Find expense by ID
   */
  findById(id: ExpenseId, workspaceId: string): Promise<Expense | null>;

  /**
   * Find all expenses by workspace
   */
  findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Expense>>;

  /**
   * Find expenses by user
   */
  findByUser(
    userId: string,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Expense>>;

  /**
   * Find expenses by category
   */
  findByCategory(
    categoryId: CategoryId,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Expense>>;

  /**
   * Find expenses by status
   */
  findByStatus(
    status: ExpenseStatus,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Expense>>;

  /**
   * Find expenses with filters
   */
  findWithFilters(filters: ExpenseFilters): Promise<PaginatedResult<Expense>>;

  /**
   * Delete expense
   */
  delete(id: ExpenseId, workspaceId: string): Promise<void>;

  /**
   * Check if expense exists
   */
  exists(id: ExpenseId, workspaceId: string): Promise<boolean>;

  /**
   * Get total expense amount by workspace
   */
  getTotalByWorkspace(workspaceId: string, currency?: string): Promise<number>;

  /**
   * Get total expense amount by user
   */
  getTotalByUser(
    userId: string,
    workspaceId: string,
    currency?: string,
  ): Promise<number>;

  /**
   * Get total expense amount by category
   */
  getTotalByCategory(
    categoryId: CategoryId,
    workspaceId: string,
    currency?: string,
  ): Promise<number>;

  /**
   * Get expense count by status
   */
  getCountByStatus(status: ExpenseStatus, workspaceId: string): Promise<number>;

  /**
   * Get aggregated statistics (optimized single query)
   */
  getStatistics(
    workspaceId: string,
    userId?: string,
    currency?: string,
  ): Promise<{
    totalAmount: number;
    currency: string;
    countByStatus: Record<ExpenseStatus, number>;
  }>;
}
