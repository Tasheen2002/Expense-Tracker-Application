import { PolicyExemption } from "../entities/policy-exemption.entity";
import { ExemptionId } from "../value-objects/exemption-id";
import { ExemptionStatus } from "../enums/exemption-status.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface ExemptionFilters {
  status?: ExemptionStatus;
  userId?: string;
  policyId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ExemptionRepository {
  save(exemption: PolicyExemption): Promise<void>;
  findById(id: ExemptionId): Promise<PolicyExemption | null>;
  findByWorkspace(
    workspaceId: string,
    filters?: ExemptionFilters,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyExemption>>;
  findByUser(
    workspaceId: string,
    userId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyExemption>>;
  findActiveForUser(
    workspaceId: string,
    userId: string,
    policyId: string,
  ): Promise<PolicyExemption | null>;
  findActiveForUserPolicies(
    workspaceId: string,
    userId: string,
    policyIds: string[],
  ): Promise<Map<string, PolicyExemption>>;
  findPendingByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyExemption>>;
  countByWorkspace(
    workspaceId: string,
    filters?: ExemptionFilters,
  ): Promise<number>;
  delete(id: ExemptionId): Promise<void>;
}
