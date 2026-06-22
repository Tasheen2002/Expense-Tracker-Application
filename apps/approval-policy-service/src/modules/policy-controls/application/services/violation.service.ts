import {
  IViolationRepository,
  ViolationFilters,
} from "../../domain/repositories/violation.repository";
import { PolicyViolation, PolicyViolationDTO } from "../../domain/entities/policy-violation.entity";
import { ViolationId } from "../../domain/value-objects/violation-id";
import { ViolationSeverity } from "../../domain/enums/violation-severity.enum";
import { ViolationNotFoundError } from "../../domain/errors/policy-controls.errors";
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export class ViolationService {
  constructor(private readonly violationRepository: IViolationRepository) {}

  async createViolation(params: {
    workspaceId: string;
    policyId: string;
    expenseId: string;
    userId: string;
    severity: ViolationSeverity;
    violationDetails: string;
    expenseAmount?: number;
    currency?: string;
  }): Promise<PolicyViolationDTO> {
    const violation = PolicyViolation.create({
      workspaceId: params.workspaceId,
      policyId: params.policyId,
      expenseId: params.expenseId,
      userId: params.userId,
      severity: params.severity,
      violationDetails: params.violationDetails,
      expenseAmount: params.expenseAmount,
      currency: params.currency,
    });

    await this.violationRepository.save(violation);
    return PolicyViolation.toDTO(violation);
  }

  async getViolation(
    violationId: string,
    workspaceId: string,
  ): Promise<PolicyViolationDTO> {
    const violation = await this._getViolationEntity(violationId, workspaceId);
    return PolicyViolation.toDTO(violation);
  }

  private async _getViolationEntity(
    violationId: string,
    workspaceId: string,
  ): Promise<PolicyViolation> {
    const violation = await this.violationRepository.findById(
      ViolationId.fromString(violationId),
    );

    if (!violation || violation.workspaceId.getValue() !== workspaceId) {
      throw new ViolationNotFoundError(violationId);
    }

    return violation;
  }

  async listViolations(
    workspaceId: string,
    filters?: ViolationFilters,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyViolationDTO>> {
    const result = await this.violationRepository.findByWorkspace(
      workspaceId,
      filters,
      options,
    );
    return {
      ...result,
      items: result.items.map((v) => PolicyViolation.toDTO(v)),
    };
  }

  async listViolationsByExpense(expenseId: string): Promise<PolicyViolationDTO[]> {
    const violations = await this.violationRepository.findByExpense(expenseId);
    return violations.map((v) => PolicyViolation.toDTO(v));
  }

  async listViolationsByUser(
    workspaceId: string,
    userId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyViolationDTO>> {
    const result = await this.violationRepository.findByUser(workspaceId, userId, options);
    return {
      ...result,
      items: result.items.map((v) => PolicyViolation.toDTO(v)),
    };
  }

  async listPendingViolations(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyViolationDTO>> {
    const result = await this.violationRepository.findPendingByWorkspace(
      workspaceId,
      options,
    );
    return {
      ...result,
      items: result.items.map((v) => PolicyViolation.toDTO(v)),
    };
  }

  async countViolations(
    workspaceId: string,
    filters?: ViolationFilters,
  ): Promise<number> {
    return this.violationRepository.countByWorkspace(workspaceId, filters);
  }

  async acknowledgeViolation(
    violationId: string,
    workspaceId: string,
    userId: string,
  ): Promise<PolicyViolationDTO> {
    const violation = await this._getViolationEntity(violationId, workspaceId);
    violation.acknowledge(userId);
    await this.violationRepository.save(violation);
    return PolicyViolation.toDTO(violation);
  }

  async resolveViolation(
    violationId: string,
    workspaceId: string,
    userId: string,
    notes?: string,
  ): Promise<PolicyViolationDTO> {
    const violation = await this._getViolationEntity(violationId, workspaceId);
    violation.resolve(userId, notes);
    await this.violationRepository.save(violation);
    return PolicyViolation.toDTO(violation);
  }

  async exemptViolation(
    violationId: string,
    workspaceId: string,
    userId: string,
    notes?: string,
  ): Promise<PolicyViolationDTO> {
    const violation = await this._getViolationEntity(violationId, workspaceId);
    violation.exempt(userId, notes);
    await this.violationRepository.save(violation);
    return PolicyViolation.toDTO(violation);
  }

  async overrideViolation(
    violationId: string,
    workspaceId: string,
    userId: string,
    notes?: string,
  ): Promise<PolicyViolationDTO> {
    const violation = await this._getViolationEntity(violationId, workspaceId);
    violation.override(userId, notes);
    await this.violationRepository.save(violation);
    return PolicyViolation.toDTO(violation);
  }

  async deleteViolation(
    violationId: string,
    workspaceId: string,
  ): Promise<void> {
    const violation = await this._getViolationEntity(violationId, workspaceId);
    await this.violationRepository.delete(violation.id);
  }

  async deleteViolationsByExpense(expenseId: string): Promise<void> {
    await this.violationRepository.deleteByExpense(expenseId);
  }
}
