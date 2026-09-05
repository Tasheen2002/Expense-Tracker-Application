import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { ResponseHelper } from '@shared/response.helper';
import {
  CreatePolicyHandler,
  UpdatePolicyHandler,
  ActivatePolicyHandler,
  DeactivatePolicyHandler,
  DeletePolicyHandler,
  GetPolicyHandler,
  ListPoliciesHandler,
} from '../../../application';
import {
  CreatePolicyInput,
  UpdatePolicyInput,
  ListPoliciesQuery,
} from '../validation/policy.schema';

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

  async getPolicy(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; policyId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, policyId } = request.params;

      const policy = await this.getPolicyHandler.handle({ policyId, workspaceId });

      return ResponseHelper.ok(reply, 'Policy retrieved successfully', policy);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listPolicies(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: ListPoliciesQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { activeOnly, limit, offset, policyType } = request.query;

      const result = await this.listPoliciesHandler.handle({
        workspaceId,
        activeOnly,
        policyType,
        pagination: {
          limit,
          offset,
        },
      });

      return ResponseHelper.ok(reply, 'Policies retrieved successfully', {
        items: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async createPolicy(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: CreatePolicyInput;
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
      Body: UpdatePolicyInput;
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
        'Policy updated successfully',
        result.data
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

      const result = await this.deletePolicyHandler.handle({ policyId, workspaceId });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Policy deleted successfully',
        result.data
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

      const result = await this.activatePolicyHandler.handle({ policyId, workspaceId });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Policy activated successfully',
        result.data
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

      const result = await this.deactivatePolicyHandler.handle({ policyId, workspaceId });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Policy deactivated successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
