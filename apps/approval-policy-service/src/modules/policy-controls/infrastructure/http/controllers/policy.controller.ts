import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { ResponseHelper } from '@shared/response.helper';
import { getAuthenticatedActorId, extractAuthToken } from './controller.helper';
import {
  CreatePolicyHandler,
  UpdatePolicyHandler,
  ActivatePolicyHandler,
  DeactivatePolicyHandler,
  DeletePolicyHandler,
  GetPolicyHandler,
  ListPoliciesHandler,
  EvaluateExpenseHandler,
  CheckExpenseHandler,
} from '../../../application';
import {
  CreatePolicyInput,
  UpdatePolicyInput,
  ListPoliciesQuery,
  EvaluateExpenseBody,
  CheckExpenseBody,
} from '../validation/policy.schema';

export class PolicyController {
  constructor(
    private readonly createPolicyHandler: CreatePolicyHandler,
    private readonly updatePolicyHandler: UpdatePolicyHandler,
    private readonly activatePolicyHandler: ActivatePolicyHandler,
    private readonly deactivatePolicyHandler: DeactivatePolicyHandler,
    private readonly deletePolicyHandler: DeletePolicyHandler,
    private readonly getPolicyHandler: GetPolicyHandler,
    private readonly listPoliciesHandler: ListPoliciesHandler,
    private readonly evaluateExpenseHandler?: EvaluateExpenseHandler,
    private readonly checkExpenseHandler?: CheckExpenseHandler
  ) {}

  async getPolicy(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; policyId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, policyId } = request.params;
      const actorId = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const policy = await this.getPolicyHandler.handle({
        actorId,
        policyId,
        workspaceId,
        authToken,
      });

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
      const actorId = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const result = await this.listPoliciesHandler.handle({
        actorId,
        workspaceId,
        activeOnly,
        policyType,
        pagination: {
          limit,
          offset,
        },
        authToken,
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
      const userId = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const result = await this.createPolicyHandler.handle({
        workspaceId,
        actorId: userId,
        createdBy: userId,
        authToken,
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
      const userId = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const result = await this.updatePolicyHandler.handle({
        policyId,
        workspaceId,
        actorId: userId,
        authToken,
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
      const userId = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const result = await this.deletePolicyHandler.handle({
        policyId,
        workspaceId,
        actorId: userId,
        authToken,
      });

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
      const userId = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const result = await this.activatePolicyHandler.handle({
        policyId,
        workspaceId,
        actorId: userId,
        authToken,
      });

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
      const userId = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const result = await this.deactivatePolicyHandler.handle({
        policyId,
        workspaceId,
        actorId: userId,
        authToken,
      });

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

  async evaluateExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: EvaluateExpenseBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      if (!this.evaluateExpenseHandler) {
        throw new Error('EvaluateExpenseHandler is not configured');
      }

      const { workspaceId } = request.params;
      const body = request.body;
      const actorId = request.user ? getAuthenticatedActorId(request) : undefined;
      const authToken = extractAuthToken(request);
      const servicePrincipal = request.servicePrincipal;

      const result = await this.evaluateExpenseHandler.handle({
        workspaceId,
        actorId,
        servicePrincipal,
        authToken,
        expenseId: body.expenseId,
        userId: body.userId,
        amount: body.amount,
        currency: body.currency,
        categoryId: body.categoryId,
        merchant: body.merchant,
        description: body.description,
        hasReceipt: body.hasReceipt,
        expenseDate: body.expenseDate || new Date(),
        userRole: body.userRole,
        timezone: body.timezone,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Expense evaluated successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async checkExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: CheckExpenseBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      if (!this.checkExpenseHandler) {
        return ResponseHelper.error(
          reply,
          new Error('CheckExpenseHandler not configured')
        );
      }

      const { workspaceId } = request.params;
      const body = request.body;
      const actorId = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const result = await this.checkExpenseHandler.handle({
        workspaceId,
        actorId,
        amount: body.amount,
        currency: body.currency,
        categoryId: body.categoryId,
        merchant: body.merchant,
        description: body.description,
        hasReceipt: body.hasReceipt,
        expenseDate: body.expenseDate,
        timezone: body.timezone,
        authToken,
      });

      return ResponseHelper.ok(reply, 'Expense check evaluated successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
