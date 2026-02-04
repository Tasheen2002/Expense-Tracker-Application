import {
  ExemptionRepository,
  ExemptionFilters,
} from "../../domain/repositories/exemption.repository";
import { PolicyExemption } from "../../domain/entities/policy-exemption.entity";
import { ExemptionId } from "../../domain/value-objects/exemption-id";
import {
  ExemptionNotFoundError,
  UnauthorizedExemptionApprovalError,
} from "../../domain/errors/policy-controls.errors";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class ExemptionService {
  constructor(private readonly exemptionRepository: ExemptionRepository) {}

  async requestExemption(params: {
    workspaceId: string;
    policyId: string;
    userId: string;
    requestedBy: string;
    reason: string;
    startDate: Date;
    endDate: Date;
  }): Promise<PolicyExemption> {
    const exemption = PolicyExemption.create({
      workspaceId: params.workspaceId,
      policyId: params.policyId,
      userId: params.userId,
      requestedBy: params.requestedBy,
      reason: params.reason,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    await this.exemptionRepository.save(exemption);
    return exemption;
  }

  async getExemption(
    exemptionId: string,
    workspaceId: string,
  ): Promise<PolicyExemption> {
    const exemption = await this.exemptionRepository.findById(
      ExemptionId.fromString(exemptionId),
    );

    if (!exemption || exemption.getWorkspaceId().getValue() !== workspaceId) {
      throw new ExemptionNotFoundError(exemptionId);
    }

    return exemption;
  }

  async listExemptions(
    workspaceId: string,
    filters?: ExemptionFilters,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyExemption>> {
    return this.exemptionRepository.findByWorkspace(
      workspaceId,
      filters,
      options,
    );
  }

  async listExemptionsByUser(
    workspaceId: string,
    userId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyExemption>> {
    return this.exemptionRepository.findByUser(workspaceId, userId, options);
  }

  async listPendingExemptions(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyExemption>> {
    return this.exemptionRepository.findPendingByWorkspace(
      workspaceId,
      options,
    );
  }

  async countExemptions(
    workspaceId: string,
    filters?: ExemptionFilters,
  ): Promise<number> {
    return this.exemptionRepository.countByWorkspace(workspaceId, filters);
  }

  async checkActiveExemption(
    workspaceId: string,
    userId: string,
    policyId: string,
  ): Promise<PolicyExemption | null> {
    return this.exemptionRepository.findActiveForUser(
      workspaceId,
      userId,
      policyId,
    );
  }

  async approveExemption(
    exemptionId: string,
    workspaceId: string,
    approvedBy: string,
  ): Promise<PolicyExemption> {
    const exemption = await this.getExemption(exemptionId, workspaceId);

    // Cannot approve your own exemption request
    if (exemption.getRequestedBy() === approvedBy) {
      throw new UnauthorizedExemptionApprovalError(approvedBy);
    }

    exemption.approve(approvedBy);
    await this.exemptionRepository.save(exemption);
    return exemption;
  }

  async rejectExemption(
    exemptionId: string,
    workspaceId: string,
    rejectedBy: string,
    reason?: string,
  ): Promise<PolicyExemption> {
    const exemption = await this.getExemption(exemptionId, workspaceId);
    exemption.reject(rejectedBy, reason);
    await this.exemptionRepository.save(exemption);
    return exemption;
  }

  async updateExemptionDates(
    exemptionId: string,
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<PolicyExemption> {
    const exemption = await this.getExemption(exemptionId, workspaceId);
    exemption.updateDates(startDate, endDate);
    await this.exemptionRepository.save(exemption);
    return exemption;
  }

  async updateExemptionReason(
    exemptionId: string,
    workspaceId: string,
    reason: string,
  ): Promise<PolicyExemption> {
    const exemption = await this.getExemption(exemptionId, workspaceId);
    exemption.updateReason(reason);
    await this.exemptionRepository.save(exemption);
    return exemption;
  }

  async deleteExemption(
    exemptionId: string,
    workspaceId: string,
  ): Promise<void> {
    const exemption = await this.getExemption(exemptionId, workspaceId);
    await this.exemptionRepository.delete(exemption.getId());
  }
}
