import { IPolicyRepository } from "../../domain/repositories/policy.repository";
import {
  ExpensePolicy,
  ExpensePolicyDTO,
  PolicyConfiguration,
} from "../../domain/entities/expense-policy.entity";
import { PolicyId } from "../../domain/value-objects/policy-id";
import { PolicyType } from "../../domain/enums/policy-type.enum";
import { ViolationSeverity } from "../../domain/enums/violation-severity.enum";
import {
  PolicyNotFoundError,
  PolicyNameAlreadyExistsError,
} from "../../domain/errors/policy-controls.errors";
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export class PolicyService {
  constructor(private readonly policyRepository: IPolicyRepository) {}

  async createPolicy(params: {
    workspaceId: string;
    name: string;
    description?: string;
    policyType: PolicyType;
    severity: ViolationSeverity;
    configuration: PolicyConfiguration;
    priority?: number;
    createdBy: string;
  }): Promise<ExpensePolicyDTO> {
    // Check if policy with same name exists in workspace
    const existingPolicy = await this.policyRepository.findByNameInWorkspace(
      params.workspaceId,
      params.name,
    );
    if (existingPolicy) {
      throw new PolicyNameAlreadyExistsError(params.name, params.workspaceId);
    }

    const policy = ExpensePolicy.create({
      workspaceId: params.workspaceId,
      name: params.name,
      description: params.description,
      policyType: params.policyType,
      severity: params.severity,
      configuration: params.configuration,
      priority: params.priority,
      createdBy: params.createdBy,
    });

    await this.policyRepository.save(policy);
    return ExpensePolicy.toDTO(policy);
  }

  async updatePolicy(params: {
    policyId: string;
    workspaceId: string;
    name?: string;
    description?: string;
    severity?: ViolationSeverity;
    configuration?: PolicyConfiguration;
    priority?: number;
  }): Promise<ExpensePolicyDTO> {
    const policy = await this._getPolicyEntity(params.policyId, params.workspaceId);

    if (params.name && params.name !== policy.name) {
      // Check if new name already exists
      const existingPolicy = await this.policyRepository.findByNameInWorkspace(
        params.workspaceId,
        params.name,
      );
      if (
        existingPolicy &&
        existingPolicy.id.getValue() !== params.policyId
      ) {
        throw new PolicyNameAlreadyExistsError(params.name, params.workspaceId);
      }
      policy.updateName(params.name);
    }

    if (params.description !== undefined) {
      policy.updateDescription(params.description);
    }

    if (params.severity) {
      policy.updateSeverity(params.severity);
    }

    if (params.configuration) {
      policy.updateConfiguration(params.configuration);
    }

    if (params.priority !== undefined) {
      policy.updatePriority(params.priority);
    }

    await this.policyRepository.save(policy);
    return ExpensePolicy.toDTO(policy);
  }

  async getPolicy(
    policyId: string,
    workspaceId: string,
  ): Promise<ExpensePolicyDTO> {
    const policy = await this._getPolicyEntity(policyId, workspaceId);
    return ExpensePolicy.toDTO(policy);
  }

  private async _getPolicyEntity(
    policyId: string,
    workspaceId: string,
  ): Promise<ExpensePolicy> {
    const policy = await this.policyRepository.findById(
      PolicyId.fromString(policyId),
    );

    if (!policy || policy.workspaceId.getValue() !== workspaceId) {
      throw new PolicyNotFoundError(policyId);
    }

    return policy;
  }

  async listPolicies(
    workspaceId: string,
    activeOnly = false,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpensePolicyDTO>> {
    let result: PaginatedResult<ExpensePolicy>;
    if (activeOnly) {
      result = await this.policyRepository.findActiveByWorkspace(workspaceId, options);
    } else {
      result = await this.policyRepository.findByWorkspace(workspaceId, options);
    }
    return {
      ...result,
      items: result.items.map((p) => ExpensePolicy.toDTO(p)),
    };
  }

  async listPoliciesByType(
    workspaceId: string,
    type: PolicyType,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpensePolicyDTO>> {
    const result = await this.policyRepository.findByType(workspaceId, type, options);
    return {
      ...result,
      items: result.items.map((p) => ExpensePolicy.toDTO(p)),
    };
  }

  async activatePolicy(
    policyId: string,
    workspaceId: string,
  ): Promise<ExpensePolicyDTO> {
    const policy = await this._getPolicyEntity(policyId, workspaceId);
    policy.activate();
    await this.policyRepository.save(policy);
    return ExpensePolicy.toDTO(policy);
  }

  async deactivatePolicy(
    policyId: string,
    workspaceId: string,
  ): Promise<ExpensePolicyDTO> {
    const policy = await this._getPolicyEntity(policyId, workspaceId);
    policy.deactivate();
    await this.policyRepository.save(policy);
    return ExpensePolicy.toDTO(policy);
  }

  async deletePolicy(policyId: string, workspaceId: string): Promise<void> {
    const policy = await this._getPolicyEntity(policyId, workspaceId);
    await this.policyRepository.delete(policy.id);
  }
}
