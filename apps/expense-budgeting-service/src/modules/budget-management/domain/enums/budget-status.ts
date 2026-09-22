export enum BudgetStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  EXCEEDED = 'EXCEEDED',
}

export const BudgetStatusTransitions: Record<BudgetStatus, BudgetStatus[]> = {
  [BudgetStatus.DRAFT]: [BudgetStatus.ACTIVE, BudgetStatus.ARCHIVED],
  [BudgetStatus.ACTIVE]: [BudgetStatus.EXCEEDED, BudgetStatus.ARCHIVED],
  [BudgetStatus.EXCEEDED]: [BudgetStatus.ARCHIVED],
  [BudgetStatus.ARCHIVED]: [],
}

export function isValidStatusTransition(from: BudgetStatus, to: BudgetStatus): boolean {
  return BudgetStatusTransitions[from]?.includes(to) ?? false
}
