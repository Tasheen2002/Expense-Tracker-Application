export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REIMBURSED = 'REIMBURSED',
}

export function isValidExpenseStatus(value: string): value is ExpenseStatus {
  return Object.values(ExpenseStatus).includes(value as ExpenseStatus)
}

export const ExpenseStatusTransitions: Record<ExpenseStatus, ExpenseStatus[]> = {
  [ExpenseStatus.DRAFT]: [ExpenseStatus.SUBMITTED],
  [ExpenseStatus.SUBMITTED]: [ExpenseStatus.APPROVED, ExpenseStatus.REJECTED, ExpenseStatus.DRAFT],
  [ExpenseStatus.APPROVED]: [ExpenseStatus.REIMBURSED],
  [ExpenseStatus.REJECTED]: [ExpenseStatus.DRAFT],
  [ExpenseStatus.REIMBURSED]: [],
}

export function canTransitionTo(from: ExpenseStatus, to: ExpenseStatus): boolean {
  return ExpenseStatusTransitions[from].includes(to)
}
