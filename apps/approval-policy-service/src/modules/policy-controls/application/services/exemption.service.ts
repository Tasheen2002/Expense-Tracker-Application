import {
  IExemptionRepository,
  ExemptionFilters,
} from "../../domain/repositories/exemption.repository";
import { IPolicyRepository } from "../../domain/repositories/policy.repository";
import { PolicyExemption, PolicyExemptionDTO, ExemptionScope } from "../../domain/entities/policy-exemption.entity";
import { ExemptionId, PolicyId } from "../../domain/value-objects";
import {
  ExemptionNotFoundError,
  UnauthorizedExemptionApprovalError,
  ExemptionExpiredError,
  PolicyNotFoundError,
} from "../../domain/errors/policy-controls.errors";
import { WorkspaceId, UserId } from '@core/domain/value-objects';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export class ExemptionService {
  constructor(
    private readonly exemptionRepository: IExemptionRepository,
    private readonly policyRepository: IPolicyRepository
  ) {}

  async requestExemption(params: {
    workspaceId: string;
    policyId: string;
    userId: string;
    requestedBy: string;
    reason: string;
    startDate: Date;
    endDate: Date;
    scope?: ExemptionScope;
  }): Promise<PolicyExemptionDTO> {
    const policy = await this.policyRepository.findById(PolicyId.fromString(params.policyId));
    if (!policy || policy.workspaceId.getValue() !== params.workspaceId) {
      throw new PolicyNotFoundError(params.policyId);
    }

    const exemption = PolicyExemption.create({
      workspaceId: params.workspaceId,
      policyId: params.policyId,
      userId: params.userId,
      requestedBy: params.requestedBy,
      reason: params.reason,
      startDate: params.startDate,
      endDate: params.endDate,
      scope: params.scope,
    });

    await this.exemptionRepository.save(exemption);
    return PolicyExemption.toDTO(exemption);
  }

  async getExemption(
    exemptionId: string,
    workspaceId: string,
  ): Promise<PolicyExemptionDTO> {
    const exemption = await this._getExemptionEntity(exemptionId, workspaceId);
    return PolicyExemption.toDTO(exemption);
  }

  private async _getExemptionEntity(
    exemptionId: string,
    workspaceId: string,
  ): Promise<PolicyExemption> {
    const exemption = await this.exemptionRepository.findById(
      ExemptionId.fromString(exemptionId),
    );

    if (!exemption || exemption.workspaceId.getValue() !== workspaceId) {
      throw new ExemptionNotFoundError(exemptionId);
    }

    return exemption;
  }

  async listExemptions(
    workspaceId: string,
    filters?: ExemptionFilters,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyExemptionDTO>> {
    const result = await this.exemptionRepository.findByWorkspace(
      WorkspaceId.fromString(workspaceId),
      filters,
      options,
    );
    return {
      ...result,
      items: result.items.map((e) => PolicyExemption.toDTO(e)),
    };
  }

  async listExemptionsByUser(
    workspaceId: string,
    userId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyExemptionDTO>> {
    const result = await this.exemptionRepository.findByUser(
      WorkspaceId.fromString(workspaceId),
      UserId.fromString(userId),
      options
    );
    return {
      ...result,
      items: result.items.map((e) => PolicyExemption.toDTO(e)),
    };
  }

  async listPendingExemptions(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyExemptionDTO>> {
    const result = await this.exemptionRepository.findPendingByWorkspace(
      WorkspaceId.fromString(workspaceId),
      options,
    );
    return {
      ...result,
      items: result.items.map((e) => PolicyExemption.toDTO(e)),
    };
  }

  async countExemptions(
    workspaceId: string,
    filters?: ExemptionFilters,
  ): Promise<number> {
    return this.exemptionRepository.countByWorkspace(
      WorkspaceId.fromString(workspaceId),
      filters
    );
  }

  async checkActiveExemption(
    workspaceId: string,
    userId: string,
    policyId: string,
  ): Promise<PolicyExemptionDTO | null> {
    const exemption = await this.exemptionRepository.findActiveForUser(
      WorkspaceId.fromString(workspaceId),
      UserId.fromString(userId),
      PolicyId.fromString(policyId)
    );
    return exemption ? PolicyExemption.toDTO(exemption) : null;
  }

  async approveExemption(
    exemptionId: string,
    workspaceId: string,
    approvedBy: string,
    approvalNote?: string,
  ): Promise<PolicyExemptionDTO> {
    const exemption = await this._getExemptionEntity(exemptionId, workspaceId);
    const approverUserId = UserId.fromString(approvedBy);
    // Cannot approve your own exemption request
    if (exemption.requestedBy.equals(approverUserId)) {
      throw new UnauthorizedExemptionApprovalError(approvedBy);
    }

    if (exemption.isExpired()) {
      exemption.markExpired();
      await this.exemptionRepository.save(exemption);
      throw new ExemptionExpiredError(exemptionId);
    }

    exemption.approve(approvedBy, approvalNote);
    await this.exemptionRepository.save(exemption);
    return PolicyExemption.toDTO(exemption);
  }

  async rejectExemption(
    exemptionId: string,
    workspaceId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<PolicyExemptionDTO> {
    const exemption = await this._getExemptionEntity(exemptionId, workspaceId);
    exemption.reject(rejectedBy, reason);
    await this.exemptionRepository.save(exemption);
    return PolicyExemption.toDTO(exemption);
  }

  async updateExemptionDates(
    exemptionId: string,
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<PolicyExemptionDTO> {
    const exemption = await this._getExemptionEntity(exemptionId, workspaceId);
    exemption.updateDates(startDate, endDate);
    await this.exemptionRepository.save(exemption);
    return PolicyExemption.toDTO(exemption);
  }

  async updateExemptionReason(
    exemptionId: string,
    workspaceId: string,
    reason: string,
  ): Promise<PolicyExemptionDTO> {
    const exemption = await this._getExemptionEntity(exemptionId, workspaceId);
    exemption.updateReason(reason);
    await this.exemptionRepository.save(exemption);
    return PolicyExemption.toDTO(exemption);
  }

  async deleteExemption(
    exemptionId: string,
    workspaceId: string,
  ): Promise<void> {
    const exemption = await this._getExemptionEntity(exemptionId, workspaceId);
    await this.exemptionRepository.delete(exemption.id);
  }
}
