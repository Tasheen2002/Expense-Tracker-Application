import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";
import { PolicyService } from "../../../application/services/policy.service";
import { ExpensePolicy } from "../../../domain/entities/expense-policy.entity";
import { PolicyType } from "../../../domain/enums/policy-type.enum";
import { ViolationSeverity } from "../../../domain/enums/violation-severity.enum";

export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  async createPolicy(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: {
        name: string;
        description?: string;
        policyType: PolicyType;
        severity: ViolationSeverity;
        configuration: Record<string, unknown>;
        priority?: number;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const userId = request.user?.id;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          error: "Unauthorized",
          message: "User not authenticated",
        });
      }

      const policy = await this.policyService.createPolicy({
        workspaceId,
        createdBy: userId,
        ...request.body,
      });

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: "Policy created successfully",
        data: this.serializePolicy(policy),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updatePolicy(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; policyId: string };
      Body: {
        name?: string;
        description?: string;
        severity?: ViolationSeverity;
        configuration?: Record<string, unknown>;
        priority?: number;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, policyId } = request.params;

      const policy = await this.policyService.updatePolicy({
        policyId,
        workspaceId,
        ...request.body,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Policy updated successfully",
        data: this.serializePolicy(policy),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getPolicy(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; policyId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, policyId } = request.params;

      const policy = await this.policyService.getPolicy(policyId, workspaceId);

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Policy retrieved successfully",
        data: this.serializePolicy(policy),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listPolicies(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { activeOnly?: string; policyType?: PolicyType };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const activeOnly = request.query.activeOnly === "true";

      const policies = await this.policyService.listPolicies(
        workspaceId,
        activeOnly,
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Policies retrieved successfully",
        data: policies.map((policy) => this.serializePolicy(policy)),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deletePolicy(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; policyId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, policyId } = request.params;

      await this.policyService.deletePolicy(policyId, workspaceId);

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Policy deleted successfully",
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activatePolicy(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; policyId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, policyId } = request.params;

      const policy = await this.policyService.activatePolicy(
        policyId,
        workspaceId,
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Policy activated successfully",
        data: this.serializePolicy(policy),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deactivatePolicy(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; policyId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, policyId } = request.params;

      const policy = await this.policyService.deactivatePolicy(
        policyId,
        workspaceId,
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Policy deactivated successfully",
        data: this.serializePolicy(policy),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  private serializePolicy(policy: ExpensePolicy) {
    return {
      id: policy.getId().getValue(),
      workspaceId: policy.getWorkspaceId().getValue(),
      name: policy.getName(),
      description: policy.getDescription(),
      policyType: policy.getPolicyType(),
      severity: policy.getSeverity(),
      configuration: policy.getConfiguration(),
      priority: policy.getPriority(),
      isActive: policy.isActive(),
      createdBy: policy.getCreatedBy(),
      createdAt: policy.getCreatedAt().toISOString(),
      updatedAt: policy.getUpdatedAt().toISOString(),
    };
  }
}
