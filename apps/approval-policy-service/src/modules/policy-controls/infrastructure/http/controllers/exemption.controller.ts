import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { ResponseHelper } from '@shared/response.helper';
import { getAuthenticatedActorId, extractAuthToken } from './controller.helper';
import {
  GetExemptionHandler,
  ListExemptionsHandler,
  CheckActiveExemptionHandler,
  RequestExemptionHandler,
  ApproveExemptionHandler,
  RejectExemptionHandler,
  ExpireExemptionsHandler,
} from '../../../application';
import {
  RequestExemptionInput,
  ApproveExemptionInput,
  RejectExemptionInput,
  ListExemptionsQuery,
  CheckActiveExemptionQuery,
} from '../validation/exemption.schema';

export class ExemptionController {
  constructor(
    private readonly getExemptionHandler: GetExemptionHandler,
    private readonly listExemptionsHandler: ListExemptionsHandler,
    private readonly checkActiveExemptionHandler: CheckActiveExemptionHandler,
    private readonly requestExemptionHandler: RequestExemptionHandler,
    private readonly approveExemptionHandler: ApproveExemptionHandler,
    private readonly rejectExemptionHandler: RejectExemptionHandler,
    private readonly expireExemptionsHandler?: ExpireExemptionsHandler
  ) {}

  async getExemption(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; exemptionId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, exemptionId } = request.params;
      const actorId = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const exemption = await this.getExemptionHandler.handle({
        actorId,
        exemptionId,
        workspaceId,
        authToken,
      });

      return ResponseHelper.ok(reply, 'Exemption retrieved successfully', exemption);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listExemptions(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: ListExemptionsQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { status, userId, policyId, limit, offset } = request.query;
      const actorId = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const result = await this.listExemptionsHandler.handle({
        actorId,
        workspaceId,
        status,
        userId,
        policyId,
        pagination: {
          limit,
          offset,
        },
        authToken,
      });

      return ResponseHelper.ok(reply, 'Exemptions retrieved successfully', {
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

  async checkActiveExemption(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: CheckActiveExemptionQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { userId, policyId } = request.query;
      const actorId = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const exemption = await this.checkActiveExemptionHandler.handle({
        actorId,
        workspaceId,
        userId,
        policyId,
        authToken,
      });

      return ResponseHelper.ok(
        reply,
        'Exemption status checked successfully',
        exemption ?? null
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async requestExemption(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: RequestExemptionInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const requestedBy = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const result = await this.requestExemptionHandler.handle({
        workspaceId,
        actorId: requestedBy,
        requestedBy,
        authToken,
        ...request.body,
        startDate: new Date(request.body.startDate),
        endDate: new Date(request.body.endDate),
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Exemption requested successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async approveExemption(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; exemptionId: string };
      Body: ApproveExemptionInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, exemptionId } = request.params;
      const approvedBy = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const result = await this.approveExemptionHandler.handle({
        exemptionId,
        workspaceId,
        actorId: approvedBy,
        approvedBy,
        approvalNote: request.body.approvalNote,
        authToken,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Exemption approved successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async rejectExemption(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; exemptionId: string };
      Body: RejectExemptionInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, exemptionId } = request.params;
      const rejectedBy = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const result = await this.rejectExemptionHandler.handle({
        exemptionId,
        workspaceId,
        actorId: rejectedBy,
        rejectedBy,
        rejectionReason: request.body.rejectionReason,
        authToken,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Exemption rejected successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async expireExemptions(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      if (!this.expireExemptionsHandler) {
        throw new Error('ExpireExemptionsHandler is not configured');
      }

      const { workspaceId } = request.params;
      const actorId = request.user ? getAuthenticatedActorId(request) : undefined;
      const authToken = extractAuthToken(request);
      const servicePrincipal = request.servicePrincipal;

      const result = await this.expireExemptionsHandler.handle({
        workspaceId,
        actorId,
        servicePrincipal,
        authToken,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Expired exemptions processed successfully',
        undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
