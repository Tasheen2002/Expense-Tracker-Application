import { describe, it, expect } from "vitest";
import { Expense } from "../domain/entities/expense.entity";
import { Money } from "../domain/value-objects/money";
import { ExpenseDate } from "../domain/value-objects/expense-date";
import { ExpenseStatus } from "../domain/enums/expense-status";
import { PaymentMethod } from "../domain/enums/payment-method";
import { UserId } from "../../identity-workspace/domain/value-objects/user-id.vo";
import { WorkspaceId } from "../../identity-workspace/domain/value-objects/workspace-id.vo";

describe("Expense Entity", () => {
  it("should create a valid expense", () => {
    const expense = Expense.create({
      workspaceId: WorkspaceId.create().getValue(),
      userId: UserId.create().getValue(),
      title: "Lunch",
      amount: Money.create(50, "USD"),
      expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.CASH,
      isReimbursable: false,
      status: ExpenseStatus.DRAFT,
      tagIds: [],
      attachmentIds: [],
    });

    expect(expense).toBeInstanceOf(Expense);
    expect(expense.title).toBe("Lunch");
    expect(expense.amount.getAmount().toNumber()).toBe(50);
  });

  it("should throw error if amount is negative", () => {
    expect(() => {
      Expense.create({
        workspaceId: WorkspaceId.create().getValue(),
        userId: UserId.create().getValue(),
        title: "Lunch",
        amount: Money.create(-10, "USD"),
        expenseDate: ExpenseDate.create(new Date()),
        paymentMethod: PaymentMethod.CASH,
        isReimbursable: false,
        status: ExpenseStatus.DRAFT,
        tagIds: [],
        attachmentIds: [],
      });
    }).toThrow();
  });
});
