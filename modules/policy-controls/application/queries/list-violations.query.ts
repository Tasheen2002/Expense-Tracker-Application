import {
  ViolationRepository,
  ViolationFilters,
} from "../../domain/repositories/violation.repository";
import { PolicyViolation } from "../../domain/entities/policy-violation.entity";
import { ViolationStatus } from "../../domain/enums/violation-status.enum";

export interface ListViolationsInput {
  workspaceId: string;
  status?: ViolationStatus;
  userId?: string;
  expenseId?: string;
  policyId?: string;
}

export class ListViolationsHandler {
  constructor(private readonly violationRepository: ViolationRepository) {}

  async handle(input: ListViolationsInput): Promise<PolicyViolation[]> {
    if (input.expenseId) {
      return this.violationRepository.findByExpense(input.expenseId);
    }

    if (input.userId) {
      return this.violationRepository.findByUser(
        input.workspaceId,
        input.userId,
      );
    }

    const filters: ViolationFilters = {
      status: input.status,
      policyId: input.policyId,
    };

    return this.violationRepository.findByWorkspace(input.workspaceId, filters);
  }
}
