import {
  ViolationRepository,
  ViolationFilters,
} from "../../domain/repositories/violation.repository";
import { PolicyViolation } from "../../domain/entities/policy-violation.entity";
import { ViolationId } from "../../domain/value-objects/violation-id";
import { ViolationSeverity } from "../../domain/enums/violation-severity.enum";
import { ViolationNotFoundError } from "../../domain/errors/policy-controls.errors";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class ViolationService {
  constructor(private readonly violationRepository: ViolationRepository) {}

  async createViolation(params: {
    workspaceId: string;
    policyId: string;
    expenseId: string;
    userId: string;
    severity: ViolationSeverity;
    violationDetails: string;
    expenseAmount?: number;
    currency?: string;
  }): Promise<PolicyViolation> {
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
    return violation;
  }

  async getViolation(
    violationId: string,
    workspaceId: string,
  ): Promise<PolicyViolation> {
    const violation = await this.violationRepository.findById(
      ViolationId.fromString(violationId),
    );

    if (!violation || violation.getWorkspaceId().getValue() !== workspaceId) {
      throw new ViolationNotFoundError(violationId);
    }

    return violation;
  }

  async listViolations(
    workspaceId: string,
    filters?: ViolationFilters,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyViolation>> {
    return this.violationRepository.findByWorkspace(
      workspaceId,
      filters,
      options,
    );
  }

  async listViolationsByExpense(expenseId: string): Promise<PolicyViolation[]> {
    return this.violationRepository.findByExpense(expenseId);
  }

  async listViolationsByUser(
    workspaceId: string,
    userId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyViolation>> {
    return this.violationRepository.findByUser(workspaceId, userId, options);
  }

  async listPendingViolations(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyViolation>> {
    return this.violationRepository.findPendingByWorkspace(
      workspaceId,
      options,
    );
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
  ): Promise<PolicyViolation> {
    const violation = await this.getViolation(violationId, workspaceId);

    // Only the user who created the expense or admins can acknowledge
    // For now, we'll just let anyone in the workspace acknowledge
    violation.acknowledge(userId);
    await this.violationRepository.save(violation);
    return violation;
  }

  async resolveViolation(
    violationId: string,
    workspaceId: string,
    userId: string,
    notes?: string,
  ): Promise<PolicyViolation> {
    const violation = await this.getViolation(violationId, workspaceId);
    violation.resolve(userId, notes);
    await this.violationRepository.save(violation);
    return violation;
  }

  async exemptViolation(
    violationId: string,
    workspaceId: string,
    userId: string,
    notes?: string,
  ): Promise<PolicyViolation> {
    const violation = await this.getViolation(violationId, workspaceId);
    violation.exempt(userId, notes);
    await this.violationRepository.save(violation);
    return violation;
  }

  async overrideViolation(
    violationId: string,
    workspaceId: string,
    userId: string,
    notes?: string,
  ): Promise<PolicyViolation> {
    const violation = await this.getViolation(violationId, workspaceId);
    violation.override(userId, notes);
    await this.violationRepository.save(violation);
    return violation;
  }

  async deleteViolation(
    violationId: string,
    workspaceId: string,
  ): Promise<void> {
    const violation = await this.getViolation(violationId, workspaceId);
    await this.violationRepository.delete(violation.getId());
  }

  async deleteViolationsByExpense(expenseId: string): Promise<void> {
    await this.violationRepository.deleteByExpense(expenseId);
  }
}
