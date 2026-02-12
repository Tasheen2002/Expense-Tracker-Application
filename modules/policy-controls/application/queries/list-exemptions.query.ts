import {
  ExemptionRepository,
  ExemptionFilters,
} from "../../domain/repositories/exemption.repository";
import { PolicyExemption } from "../../domain/entities/policy-exemption.entity";
import { ExemptionStatus } from "../../domain/enums/exemption-status.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface ListExemptionsInput {
  workspaceId: string;
  status?: ExemptionStatus;
  userId?: string;
  policyId?: string;
  pagination?: PaginationOptions;
}

export class ListExemptionsHandler {
  constructor(private readonly exemptionRepository: ExemptionRepository) {}

  async handle(input: ListExemptionsInput): Promise<PaginatedResult<PolicyExemption>> {
    if (input.userId) {
      return this.exemptionRepository.findByUser(
        input.workspaceId,
        input.userId,
        input.pagination,
      );
    }

    const filters: ExemptionFilters = {
      status: input.status,
      policyId: input.policyId,
    };

    return this.exemptionRepository.findByWorkspace(input.workspaceId, filters, input.pagination);
  }
}
