import {
  IExemptionRepository,
  ExemptionFilters,
} from "../../domain/repositories/exemption.repository";
import { PolicyExemption, PolicyExemptionDTO } from "../../domain/entities/policy-exemption.entity";
import { ExemptionId } from "../../domain/value-objects/exemption-id";
import {
  ExemptionNotFoundError,
  UnauthorizedExemptionApprovalError,
} from "../../domain/errors/policy-controls.errors";
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export class ExemptionService {
  constructor(private readonly exemptionRepository: IExemptionRepository) {}

  async requestExemption(params: {
    workspaceId: string;
    policyId: string;
    userId: string;
    requestedBy: string;
    reason: string;
    startDate: Date;
    endDate: Date;
  }): Promise<PolicyExemptionDTO> {
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
      workspaceId,
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
    const result = await this.exemptionRepository.findByUser(workspaceId, userId, options);
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
      workspaceId,
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
    return this.exemptionRepository.countByWorkspace(workspaceId, filters);
  }

  async checkActiveExemption(
    workspaceId: string,
    userId: string,
    policyId: string,
  ): Promise<PolicyExemptionDTO | null> {
    const exemption = await this.exemptionRepository.findActiveForUser(
      workspaceId,
      userId,
      policyId,
    );
    return exemption ? PolicyExemption.toDTO(exemption) : null;
  }

  async approveExemption(
    exemptionId: string,
    workspaceId: string,
    approvedBy: string,
  ): Promise<PolicyExemptionDTO> {
    const exemption = await this._getExemptionEntity(exemptionId, workspaceId);

    // Cannot approve your own exemption request
    if (exemption.requestedBy === approvedBy) {
      throw new UnauthorizedExemptionApprovalError(approvedBy);
    }

    exemption.approve(approvedBy);
    await this.exemptionRepository.save(exemption);
    return PolicyExemption.toDTO(exemption);
  }

  async rejectExemption(
    exemptionId: string,
    workspaceId: string,
    rejectedBy: string,
    reason?: string,
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
