import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';
import { GetExemptionHandler } from '../../../application/queries/get-exemption.query';
import { ListExemptionsHandler } from '../../../application/queries/list-exemptions.query';
import { CheckActiveExemptionHandler } from '../../../application/queries/check-active-exemption.query';
import { RequestExemptionHandler } from '../../../application/commands/request-exemption.command';
import { ApproveExemptionHandler } from '../../../application/commands/approve-exemption.command';
import { RejectExemptionHandler } from '../../../application/commands/reject-exemption.command';
import { ExemptionStatus } from '../../../domain/enums/exemption-status.enum';

export class ExemptionController {
  constructor(
    private readonly getExemptionHandler: GetExemptionHandler,
    private readonly listExemptionsHandler: ListExemptionsHandler,
    private readonly checkActiveExemptionHandler: CheckActiveExemptionHandler,
    private readonly requestExemptionHandler: RequestExemptionHandler,
    private readonly approveExemptionHandler: ApproveExemptionHandler,
    private readonly rejectExemptionHandler: RejectExemptionHandler
  ) {}

  async getExemption(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; exemptionId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, exemptionId } = request.params;

      const result = await this.getExemptionHandler.handle({
        exemptionId,
        workspaceId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Exemption retrieved successfully',
        result.data ? result.data.toJSON() : undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listExemptions(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: {
        status?: ExemptionStatus;
        userId?: string;
        policyId?: string;
        limit?: string;
        offset?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { status, userId, policyId, limit, offset } = request.query;

      const result = await this.listExemptionsHandler.handle({
        workspaceId,
        status,
        userId,
        policyId,
        pagination: {
          limit: limit ? parseInt(limit, 10) : 50,
          offset: offset ? parseInt(offset, 10) : 0,
        },
      });

      const data = result.data
        ? {
            items: result.data.items.map((e) => e.toJSON()),
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
        'Exemptions retrieved successfully',
        data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async checkActiveExemption(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { userId: string; policyId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { userId, policyId } = request.query;

      const result = await this.checkActiveExemptionHandler.handle({
        workspaceId,
        userId,
        policyId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Exemption status checked successfully',
        result.data ? result.data.toJSON() : null
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async requestExemption(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: {
        policyId: string;
        userId: string;
        reason: string;
        startDate: string;
        endDate: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const requestedBy = request.user!.userId;

      const result = await this.requestExemptionHandler.handle({
        workspaceId,
        requestedBy,
        ...request.body,
        startDate: new Date(request.body.startDate),
        endDate: new Date(request.body.endDate),
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Exemption requested successfully',
        result.data ? result.data.toJSON() : undefined,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async approveExemption(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; exemptionId: string };
      Body: { approvalNote?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, exemptionId } = request.params;
      const approvedBy = request.user!.userId;

      const result = await this.approveExemptionHandler.handle({
        exemptionId,
        workspaceId,
        approvedBy,
        approvalNote: request.body.approvalNote,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Exemption approved successfully',
        result.data ? result.data.toJSON() : undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async rejectExemption(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; exemptionId: string };
      Body: { rejectionReason: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, exemptionId } = request.params;
      const rejectedBy = request.user!.userId;

      const result = await this.rejectExemptionHandler.handle({
        exemptionId,
        workspaceId,
        rejectedBy,
        rejectionReason: request.body.rejectionReason,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Exemption rejected successfully',
        result.data ? result.data.toJSON() : undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
