import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '@shared/response.helper';
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

      const exemption = await this.getExemptionHandler.handle({ exemptionId, workspaceId });

      return ResponseHelper.ok(reply, 'Exemption retrieved successfully', exemption);
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

      return ResponseHelper.ok(reply, 'Exemptions retrieved successfully', {
        items: result.items,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      });
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

      const exemption = await this.checkActiveExemptionHandler.handle({
        workspaceId,
        userId,
        policyId,
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
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
