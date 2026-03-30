import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';
import { CreatePolicyHandler } from '../../../application/commands/create-policy.command';
import { UpdatePolicyHandler } from '../../../application/commands/update-policy.command';
import { ActivatePolicyHandler } from '../../../application/commands/activate-policy.command';
import { DeactivatePolicyHandler } from '../../../application/commands/deactivate-policy.command';
import { DeletePolicyHandler } from '../../../application/commands/delete-policy.command';
import { GetPolicyHandler } from '../../../application/queries/get-policy.query';
import { ListPoliciesHandler } from '../../../application/queries/list-policies.query';
import { PolicyType } from '../../../domain/enums/policy-type.enum';
import { ViolationSeverity } from '../../../domain/enums/violation-severity.enum';

export class PolicyController {
  constructor(
    private readonly createPolicyHandler: CreatePolicyHandler,
    private readonly updatePolicyHandler: UpdatePolicyHandler,
    private readonly activatePolicyHandler: ActivatePolicyHandler,
    private readonly deactivatePolicyHandler: DeactivatePolicyHandler,
    private readonly deletePolicyHandler: DeletePolicyHandler,
    private readonly getPolicyHandler: GetPolicyHandler,
    private readonly listPoliciesHandler: ListPoliciesHandler
  ) {}

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
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const userId = request.user!.userId;

      const result = await this.createPolicyHandler.handle({
        workspaceId,
        createdBy: userId,
        ...request.body,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Policy created successfully',
        result.data,
        201
      );
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
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, policyId } = request.params;

      const result = await this.updatePolicyHandler.handle({
        policyId,
        workspaceId,
        ...request.body,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Policy updated successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getPolicy(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; policyId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, policyId } = request.params;

      const result = await this.getPolicyHandler.handle({
        policyId,
        workspaceId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Policy retrieved successfully',
        result.data ? result.data.toJSON() : undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listPolicies(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: {
        activeOnly?: string;
        policyType?: PolicyType;
        limit?: string;
        offset?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { activeOnly, limit, offset } = request.query;

      const result = await this.listPoliciesHandler.handle({
        workspaceId,
        activeOnly: activeOnly === 'true',
        pagination: {
          limit: limit ? parseInt(limit, 10) : 50,
          offset: offset ? parseInt(offset, 10) : 0,
        },
      });

      const data = result.data
        ? {
            items: result.data.items.map((policy) => policy.toJSON()),
            pagination: {
              total: result.data.total,
              limit: result.data.limit,
              offset: result.data.offset,
              hasMore: result.data.hasMore,
            },
          }
        : undefined;

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Policies retrieved successfully',
        data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deletePolicy(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; policyId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, policyId } = request.params;

      const result = await this.deletePolicyHandler.handle({
        policyId,
        workspaceId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Policy deleted successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activatePolicy(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; policyId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, policyId } = request.params;

      const result = await this.activatePolicyHandler.handle({
        policyId,
        workspaceId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Policy activated successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deactivatePolicy(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; policyId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, policyId } = request.params;

      const result = await this.deactivatePolicyHandler.handle({
        policyId,
        workspaceId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Policy deactivated successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
