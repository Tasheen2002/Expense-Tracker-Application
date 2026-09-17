import {
  IViolationRepository,
  ViolationFilters,
  ViolationStats,
} from "../../domain/repositories/violation.repository";
import { IExemptionRepository } from "../../domain/repositories/exemption.repository";
import { IPolicyRepository } from "../../domain/repositories/policy.repository";
import { PolicyViolation, PolicyViolationDTO } from "../../domain/entities/policy-violation.entity";
import { ViolationId, ExemptionId, PolicyId } from "../../domain/value-objects";
import { ViolationSeverity } from "../../domain/enums/violation-severity.enum";
import {
  ViolationNotFoundError,
  InvalidExemptionForViolationError,
  PolicyNotFoundError,
  InvalidPolicyConfigurationError,
} from "../../domain/errors/policy-controls.errors";
import { WorkspaceId, UserId, ExpenseId } from '@core/domain/value-objects';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { IExpenseSnapshotService } from '@shared/ports/expense-snapshot.port';

export class ViolationService {
  constructor(
    private readonly violationRepository: IViolationRepository,
    private readonly exemptionRepository: IExemptionRepository,
    private readonly policyRepository: IPolicyRepository,
    private readonly expenseSnapshotService?: IExpenseSnapshotService
  ) {}

  async createViolation(params: {
    workspaceId: string;
    policyId: string;
    expenseId: string;
    userId: string;
    severity?: ViolationSeverity;
    violationDetails: string;
    expenseAmount: number;
    currency?: string;
  }): Promise<PolicyViolationDTO> {
    const policyId = PolicyId.fromString(params.policyId);
    const policy = await this.policyRepository.findById(policyId);
    if (!policy || policy.workspaceId.getValue() !== params.workspaceId) {
      throw new PolicyNotFoundError(params.policyId);
    }

    // Authoritative violation severity is derived directly from the loaded policy
    if (params.severity && params.severity !== policy.severity) {
      throw new InvalidPolicyConfigurationError(
        `Violation severity (${params.severity}) does not match policy severity (${policy.severity})`
      );
    }

    const violation = PolicyViolation.create({
      workspaceId: params.workspaceId,
      policyId: params.policyId,
      expenseId: params.expenseId,
      userId: params.userId,
      severity: policy.severity,
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
    const violation = await this.getViolationEntity(violationId, workspaceId);
    return PolicyViolation.toDTO(violation);
  }

  async getViolationEntity(
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
      WorkspaceId.fromString(workspaceId),
      filters,
      options,
    );
    return {
      ...result,
      items: result.items.map((v) => PolicyViolation.toDTO(v)),
    };
  }

  async listViolationsByExpense(
    workspaceId: string,
    expenseId: string
  ): Promise<PolicyViolationDTO[]> {
    const violations = await this.violationRepository.findByExpense(
      WorkspaceId.fromString(workspaceId),
      ExpenseId.fromString(expenseId)
    );
    return violations.map((v) => PolicyViolation.toDTO(v));
  }

  async listViolationsByUser(
    workspaceId: string,
    userId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyViolationDTO>> {
    const result = await this.violationRepository.findByUser(
      WorkspaceId.fromString(workspaceId),
      UserId.fromString(userId),
      options
    );
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
      WorkspaceId.fromString(workspaceId),
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
    return this.violationRepository.countByWorkspace(
      WorkspaceId.fromString(workspaceId),
      filters
    );
  }

  async getStats(
    workspaceId: string,
    filters?: { startDate?: Date; endDate?: Date }
  ): Promise<ViolationStats> {
    return this.violationRepository.getStats(
      WorkspaceId.fromString(workspaceId),
      filters
    );
  }

  async acknowledgeViolation(
    violationId: string,
    workspaceId: string,
    userId: string,
    note?: string,
  ): Promise<PolicyViolationDTO> {
    const violation = await this.getViolationEntity(violationId, workspaceId);
    violation.acknowledge(userId, note);
    await this.violationRepository.save(violation);
    return PolicyViolation.toDTO(violation);
  }

  async resolveViolation(
    violationId: string,
    workspaceId: string,
    userId: string,
    notes?: string,
  ): Promise<PolicyViolationDTO> {
    const violation = await this.getViolationEntity(violationId, workspaceId);
    violation.resolve(userId, notes);
    await this.violationRepository.save(violation);
    return PolicyViolation.toDTO(violation);
  }

  async exemptViolation(
    violationId: string,
    workspaceId: string,
    userId: string,
    notes?: string,
    exemptionId?: string,
  ): Promise<PolicyViolationDTO> {
    if (!exemptionId) {
      throw new InvalidExemptionForViolationError('Exemption ID is required to exempt a violation');
    }

    const violation = await this.getViolationEntity(violationId, workspaceId);

    const exId = ExemptionId.fromString(exemptionId);
    const exemption = await this.exemptionRepository.findById(exId);
    if (!exemption || exemption.workspaceId.getValue() !== workspaceId) {
      throw new InvalidExemptionForViolationError(
        `Exemption ${exemptionId} does not exist in workspace ${workspaceId}`
      );
    }
    if (exemption.userId.getValue() !== violation.userId.getValue()) {
      throw new InvalidExemptionForViolationError(
        `Exemption ${exemptionId} belongs to user ${exemption.userId.getValue()}, not violation owner ${violation.userId.getValue()}`
      );
    }
    if (exemption.policyId.getValue() !== violation.policyId.getValue()) {
      throw new InvalidExemptionForViolationError(
        `Exemption ${exemptionId} is for policy ${exemption.policyId.getValue()}, not violation policy ${violation.policyId.getValue()}`
      );
    }
    if (!exemption.isApproved() || exemption.isExpired()) {
      throw new InvalidExemptionForViolationError(
        `Exemption ${exemptionId} is not approved or is expired`
      );
    }

    let categoryId: string | undefined;
    let amount: number | undefined = violation.expenseAmount;
    if (this.expenseSnapshotService) {
      const snapshot = await this.expenseSnapshotService.getExpenseSnapshot({
        workspaceId: violation.workspaceId.getValue(),
        expenseId: violation.expenseId.getValue(),
        userId: violation.userId.getValue(),
      });
      if (snapshot) {
        categoryId = snapshot.categoryId;
        amount = snapshot.amount;
      }
    }

    if (!exemption.appliesTo({ categoryId, amount })) {
      throw new InvalidExemptionForViolationError(
        `Exemption ${exemptionId} does not apply to violation ${violationId} (outside approved scope)`
      );
    }

    violation.exempt(userId, notes, exId);
    await this.violationRepository.save(violation);
    return PolicyViolation.toDTO(violation);
  }

  async overrideViolation(
    violationId: string,
    workspaceId: string,
    userId: string,
    notes?: string,
  ): Promise<PolicyViolationDTO> {
    const violation = await this.getViolationEntity(violationId, workspaceId);
    violation.override(userId, notes);
    await this.violationRepository.save(violation);
    return PolicyViolation.toDTO(violation);
  }

  async deleteViolation(
    violationId: string,
    workspaceId: string,
  ): Promise<void> {
    const violation = await this.getViolationEntity(violationId, workspaceId);
    await this.violationRepository.delete(violation.id);
  }

  async deleteViolationsByExpense(
    workspaceId: string,
    expenseId: string
  ): Promise<void> {
    await this.violationRepository.deleteByExpense(
      WorkspaceId.fromString(workspaceId),
      ExpenseId.fromString(expenseId)
    );
  }
}
