import { PolicyExemption } from "../entities/policy-exemption.entity";
import { ExemptionId } from "../value-objects/exemption-id";
import { ExemptionStatus } from "../enums/exemption-status.enum";

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
  ): Promise<PolicyExemption[]>;
  findByUser(workspaceId: string, userId: string): Promise<PolicyExemption[]>;
  findActiveForUser(
    workspaceId: string,
    userId: string,
    policyId: string,
  ): Promise<PolicyExemption | null>;
  findPendingByWorkspace(workspaceId: string): Promise<PolicyExemption[]>;
  countByWorkspace(
    workspaceId: string,
    filters?: ExemptionFilters,
  ): Promise<number>;
  delete(id: ExemptionId): Promise<void>;
}
