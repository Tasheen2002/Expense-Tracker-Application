import {
  ExpenseRepository,
  ExpenseFilters,
  PaginatedResult,
} from "../../domain/repositories/expense.repository";
import { CategoryRepository } from "../../domain/repositories/category.repository";
import { TagRepository } from "../../domain/repositories/tag.repository";
import { Expense } from "../../domain/entities/expense.entity";
import { ExpenseId } from "../../domain/value-objects/expense-id";
import { CategoryId } from "../../domain/value-objects/category-id";
import { TagId } from "../../domain/value-objects/tag-id";
import { Money } from "../../domain/value-objects/money";
import { ExpenseDate } from "../../domain/value-objects/expense-date";
import { PaymentMethod } from "../../domain/enums/payment-method";
import { ExpenseStatus } from "../../domain/enums/expense-status";
import {
  CategoryNotFoundError,
  ExpenseNotFoundError,
  UnauthorizedExpenseAccessError,
  InvalidExpenseStatusError,
  TagNotFoundError,
} from "../../domain/errors/expense.errors";

export class ExpenseService {
  constructor(
    private readonly expenseRepository: ExpenseRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly tagRepository: TagRepository,
  ) {}

  async createExpense(params: {
    workspaceId: string;
    userId: string;
    title: string;
    description?: string;
    amount: number;
    currency: string;
    expenseDate: Date | string;
    categoryId?: string;
    merchant?: string;
    paymentMethod: PaymentMethod;
    isReimbursable: boolean;
    tagIds?: string[];
  }): Promise<Expense> {
    // Validate category exists if provided
    if (params.categoryId) {
      const categoryExists = await this.categoryRepository.exists(
        CategoryId.fromString(params.categoryId),
        params.workspaceId,
      );
      if (!categoryExists) {
        throw new CategoryNotFoundError(params.categoryId, params.workspaceId);
      }
    }

    // Validate tags exist if provided
    if (params.tagIds && params.tagIds.length > 0) {
      // Deduplicate tag IDs to prevent validation errors
      const uniqueTagIds = Array.from(new Set(params.tagIds));
      const tagIdObjects = uniqueTagIds.map((id) => TagId.fromString(id));
      const tags = await this.tagRepository.findByIds(
        tagIdObjects,
        params.workspaceId,
      );
      if (tags.length !== uniqueTagIds.length) {
        throw new TagNotFoundError("one_or_more", params.workspaceId);
      }
    }

    // Deduplicate tag IDs before creating expense
    const uniqueTagIds = params.tagIds
      ? Array.from(new Set(params.tagIds))
      : [];

    const expense = Expense.create({
      workspaceId: params.workspaceId,
      userId: params.userId,
      title: params.title,
      description: params.description,
      amount: Money.create(params.amount, params.currency),
      expenseDate: ExpenseDate.create(params.expenseDate),
      categoryId: params.categoryId
        ? CategoryId.fromString(params.categoryId)
        : undefined,
      merchant: params.merchant,
      paymentMethod: params.paymentMethod,
      isReimbursable: params.isReimbursable,
      status: ExpenseStatus.DRAFT,
      tagIds: uniqueTagIds.map((id) => TagId.fromString(id)),
      attachmentIds: [],
    });

    await this.expenseRepository.save(expense);

    return expense;
  }

  async updateExpense(
    expenseId: string,
    workspaceId: string,
    userId: string,
    params: {
      title?: string;
      description?: string;
      amount?: number;
      currency?: string;
      expenseDate?: Date | string;
      categoryId?: string;
      merchant?: string;
      paymentMethod?: PaymentMethod;
      isReimbursable?: boolean;
    },
  ): Promise<Expense> {
    const expense = await this.expenseRepository.findById(
      ExpenseId.fromString(expenseId),
      workspaceId,
    );

    if (!expense) {
      throw new ExpenseNotFoundError(expenseId, workspaceId);
    }

    // Check if user owns the expense
    if (expense.userId !== userId) {
      throw new UnauthorizedExpenseAccessError(expenseId, userId);
    }

    // Check if expense can be edited
    if (!expense.canBeEdited()) {
      throw new InvalidExpenseStatusError(expenseId, expense.status, "edit");
    }

    // Update fields
    if (params.title) {
      expense.updateTitle(params.title);
    }

    if (params.description !== undefined) {
      expense.updateDescription(params.description);
    }

    if (params.amount && params.currency) {
      expense.updateAmount(Money.create(params.amount, params.currency));
    }

    if (params.expenseDate) {
      expense.updateExpenseDate(ExpenseDate.create(params.expenseDate));
    }

    if (params.categoryId !== undefined) {
      if (params.categoryId) {
        const categoryExists = await this.categoryRepository.exists(
          CategoryId.fromString(params.categoryId),
          workspaceId,
        );
        if (!categoryExists) {
          throw new CategoryNotFoundError(params.categoryId, workspaceId);
        }
        expense.updateCategory(CategoryId.fromString(params.categoryId));
      } else {
        expense.updateCategory(undefined);
      }
    }

    if (params.merchant !== undefined) {
      expense.updateMerchant(params.merchant);
    }

    if (params.paymentMethod) {
      expense.updatePaymentMethod(params.paymentMethod);
    }

    if (params.isReimbursable !== undefined) {
      expense.setReimbursable(params.isReimbursable);
    }

    await this.expenseRepository.update(expense);

    return expense;
  }

  async deleteExpense(
    expenseId: string,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const expense = await this.expenseRepository.findById(
      ExpenseId.fromString(expenseId),
      workspaceId,
    );

    if (!expense) {
      throw new ExpenseNotFoundError(expenseId, workspaceId);
    }

    // Check if user owns the expense
    if (expense.userId !== userId) {
      throw new UnauthorizedExpenseAccessError(expenseId, userId);
    }

    // Check if expense can be deleted
    if (!expense.canBeDeleted()) {
      throw new InvalidExpenseStatusError(expenseId, expense.status, "delete");
    }

    await this.expenseRepository.delete(
      ExpenseId.fromString(expenseId),
      workspaceId,
    );
  }

  async getExpenseById(
    expenseId: string,
    workspaceId: string,
  ): Promise<Expense | null> {
    return await this.expenseRepository.findById(
      ExpenseId.fromString(expenseId),
      workspaceId,
    );
  }

  async getExpensesByWorkspace(workspaceId: string): Promise<Expense[]> {
    return await this.expenseRepository.findByWorkspace(workspaceId);
  }

  async getExpensesByUser(
    userId: string,
    workspaceId: string,
  ): Promise<Expense[]> {
    return await this.expenseRepository.findByUser(userId, workspaceId);
  }

  async getExpensesByCategory(
    categoryId: string,
    workspaceId: string,
  ): Promise<Expense[]> {
    return await this.expenseRepository.findByCategory(
      CategoryId.fromString(categoryId),
      workspaceId,
    );
  }

  async getExpensesByStatus(
    status: ExpenseStatus,
    workspaceId: string,
  ): Promise<Expense[]> {
    return await this.expenseRepository.findByStatus(status, workspaceId);
  }

  async getExpensesWithFilters(
    filters: ExpenseFilters,
  ): Promise<PaginatedResult<Expense>> {
    return await this.expenseRepository.findWithFilters(filters);
  }

  async submitExpense(
    expenseId: string,
    workspaceId: string,
    userId: string,
  ): Promise<Expense> {
    const expense = await this.expenseRepository.findById(
      ExpenseId.fromString(expenseId),
      workspaceId,
    );

    if (!expense) {
      throw new ExpenseNotFoundError(expenseId, workspaceId);
    }

    if (expense.userId !== userId) {
      throw new UnauthorizedExpenseAccessError(expenseId, userId);
    }

    expense.submit();

    await this.expenseRepository.update(expense);

    return expense;
  }

  async approveExpense(
    expenseId: string,
    workspaceId: string,
    approverId: string,
  ): Promise<Expense> {
    const expense = await this.expenseRepository.findById(
      ExpenseId.fromString(expenseId),
      workspaceId,
    );

    if (!expense) {
      throw new ExpenseNotFoundError(expenseId, workspaceId);
    }

    // Authorization Check: Self-approval not allowed
    if (expense.userId === approverId) {
      throw new UnauthorizedExpenseAccessError(
        expenseId,
        approverId,
        "approve (self-approval)",
      );
    }

    expense.approve();

    await this.expenseRepository.update(expense);

    return expense;
  }

  async rejectExpense(
    expenseId: string,
    workspaceId: string,
    rejecterId: string,
    reason?: string,
  ): Promise<Expense> {
    const expense = await this.expenseRepository.findById(
      ExpenseId.fromString(expenseId),
      workspaceId,
    );

    if (!expense) {
      throw new ExpenseNotFoundError(expenseId, workspaceId);
    }

    // Authorization Check: Self-rejection not allowed (or redundancy check)
    if (expense.userId === rejecterId) {
      throw new UnauthorizedExpenseAccessError(
        expenseId,
        rejecterId,
        "reject (self-rejection)",
      );
    }

    expense.reject();

    await this.expenseRepository.update(expense);

    return expense;
  }

  async revertExpenseToDraft(
    expenseId: string,
    workspaceId: string,
    userId: string,
  ): Promise<Expense> {
    const expense = await this.expenseRepository.findById(
      ExpenseId.fromString(expenseId),
      workspaceId,
    );

    if (!expense) {
      throw new ExpenseNotFoundError(expenseId, workspaceId);
    }

    if (expense.userId !== userId) {
      throw new UnauthorizedExpenseAccessError(expenseId, userId);
    }

    expense.revertToDraft();

    await this.expenseRepository.update(expense);

    return expense;
  }

  async markExpenseAsReimbursed(
    expenseId: string,
    workspaceId: string,
    processedBy: string,
  ): Promise<Expense> {
    const expense = await this.expenseRepository.findById(
      ExpenseId.fromString(expenseId),
      workspaceId,
    );

    if (!expense) {
      throw new ExpenseNotFoundError(expenseId, workspaceId);
    }

    // Authorization Check: Self-reimbursement not allowed
    if (expense.userId === processedBy) {
      throw new UnauthorizedExpenseAccessError(
        expenseId,
        processedBy,
        "reimburse (self-reimbursement)",
      );
    }

    expense.markAsReimbursed();

    await this.expenseRepository.update(expense);

    return expense;
  }

  async addTagToExpense(
    expenseId: string,
    workspaceId: string,
    userId: string,
    tagId: string,
  ): Promise<Expense> {
    const expense = await this.expenseRepository.findById(
      ExpenseId.fromString(expenseId),
      workspaceId,
    );

    if (!expense) {
      throw new ExpenseNotFoundError(expenseId, workspaceId);
    }

    if (expense.userId !== userId) {
      throw new UnauthorizedExpenseAccessError(expenseId, userId, "update");
    }

    if (!expense.canBeEdited()) {
      throw new InvalidExpenseStatusError(expenseId, expense.status, "edit");
    }

    const tagExists = await this.tagRepository.exists(
      TagId.fromString(tagId),
      workspaceId,
    );
    if (!tagExists) {
      throw new TagNotFoundError(tagId, workspaceId);
    }

    expense.addTag(TagId.fromString(tagId));

    await this.expenseRepository.update(expense);

    return expense;
  }

  async removeTagFromExpense(
    expenseId: string,
    workspaceId: string,
    userId: string,
    tagId: string,
  ): Promise<Expense> {
    const expense = await this.expenseRepository.findById(
      ExpenseId.fromString(expenseId),
      workspaceId,
    );

    if (!expense) {
      throw new ExpenseNotFoundError(expenseId, workspaceId);
    }

    if (expense.userId !== userId) {
      throw new UnauthorizedExpenseAccessError(expenseId, userId, "update");
    }

    if (!expense.canBeEdited()) {
      throw new InvalidExpenseStatusError(expenseId, expense.status, "edit");
    }

    expense.removeTag(TagId.fromString(tagId));

    await this.expenseRepository.update(expense);

    return expense;
  }

  async getTotalExpenseByWorkspace(
    workspaceId: string,
    currency?: string,
  ): Promise<{ total: number; currency?: string }> {
    const total = await this.expenseRepository.getTotalByWorkspace(
      workspaceId,
      currency,
    );
    return { total, currency };
  }

  async getTotalExpenseByUser(
    userId: string,
    workspaceId: string,
    currency?: string,
  ): Promise<{ total: number; currency?: string }> {
    const total = await this.expenseRepository.getTotalByUser(
      userId,
      workspaceId,
      currency,
    );
    return { total, currency };
  }

  async getExpenseCountByStatus(
    status: ExpenseStatus,
    workspaceId: string,
  ): Promise<number> {
    return await this.expenseRepository.getCountByStatus(status, workspaceId);
  }
}
