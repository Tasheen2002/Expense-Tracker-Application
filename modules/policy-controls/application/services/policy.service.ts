import { PolicyRepository } from "../../domain/repositories/policy.repository";
import {
  ExpensePolicy,
  PolicyConfiguration,
} from "../../domain/entities/expense-policy.entity";
import { PolicyId } from "../../domain/value-objects/policy-id";
import { PolicyType } from "../../domain/enums/policy-type.enum";
import { ViolationSeverity } from "../../domain/enums/violation-severity.enum";
import {
  PolicyNotFoundError,
  PolicyNameAlreadyExistsError,
} from "../../domain/errors/policy-controls.errors";

export class PolicyService {
  constructor(private readonly policyRepository: PolicyRepository) {}

  async createPolicy(params: {
    workspaceId: string;
    name: string;
    description?: string;
    policyType: PolicyType;
    severity: ViolationSeverity;
    configuration: PolicyConfiguration;
    priority?: number;
    createdBy: string;
  }): Promise<ExpensePolicy> {
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
    return policy;
  }

  async updatePolicy(params: {
    policyId: string;
    workspaceId: string;
    name?: string;
    description?: string;
    severity?: ViolationSeverity;
    configuration?: PolicyConfiguration;
    priority?: number;
  }): Promise<ExpensePolicy> {
    const policy = await this.getPolicy(params.policyId, params.workspaceId);

    if (params.name && params.name !== policy.getName()) {
      // Check if new name already exists
      const existingPolicy = await this.policyRepository.findByNameInWorkspace(
        params.workspaceId,
        params.name,
      );
      if (
        existingPolicy &&
        existingPolicy.getId().getValue() !== params.policyId
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
    return policy;
  }

  async getPolicy(
    policyId: string,
    workspaceId: string,
  ): Promise<ExpensePolicy> {
    const policy = await this.policyRepository.findById(
      PolicyId.fromString(policyId),
    );

    if (!policy || policy.getWorkspaceId().getValue() !== workspaceId) {
      throw new PolicyNotFoundError(policyId);
    }

    return policy;
  }

  async listPolicies(
    workspaceId: string,
    activeOnly = false,
  ): Promise<ExpensePolicy[]> {
    if (activeOnly) {
      return this.policyRepository.findActiveByWorkspace(workspaceId);
    }
    return this.policyRepository.findByWorkspace(workspaceId);
  }

  async listPoliciesByType(
    workspaceId: string,
    type: PolicyType,
  ): Promise<ExpensePolicy[]> {
    return this.policyRepository.findByType(workspaceId, type);
  }

  async activatePolicy(
    policyId: string,
    workspaceId: string,
  ): Promise<ExpensePolicy> {
    const policy = await this.getPolicy(policyId, workspaceId);
    policy.activate();
    await this.policyRepository.save(policy);
    return policy;
  }

  async deactivatePolicy(
    policyId: string,
    workspaceId: string,
  ): Promise<ExpensePolicy> {
    const policy = await this.getPolicy(policyId, workspaceId);
    policy.deactivate();
    await this.policyRepository.save(policy);
    return policy;
  }

  async deletePolicy(policyId: string, workspaceId: string): Promise<void> {
    const policy = await this.getPolicy(policyId, workspaceId);
    await this.policyRepository.delete(policy.getId());
  }
}
