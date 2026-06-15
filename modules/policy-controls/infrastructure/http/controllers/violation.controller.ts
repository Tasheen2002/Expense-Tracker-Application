import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '@shared/response.helper';
import {
  GetViolationHandler,
  ListViolationsHandler,
  GetViolationStatsHandler,
  AcknowledgeViolationHandler,
  ResolveViolationHandler,
  ExemptViolationHandler,
  OverrideViolationHandler,
} from '../../../application';
import { ViolationStatus } from '../../../domain/enums/violation-status.enum';

export class ViolationController {
  constructor(
    private readonly getViolationHandler: GetViolationHandler,
    private readonly listViolationsHandler: ListViolationsHandler,
    private readonly getViolationStatsHandler: GetViolationStatsHandler,
    private readonly acknowledgeViolationHandler: AcknowledgeViolationHandler,
    private readonly resolveViolationHandler: ResolveViolationHandler,
    private readonly exemptViolationHandler: ExemptViolationHandler,
    private readonly overrideViolationHandler: OverrideViolationHandler
  ) {}

  async getViolation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; violationId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, violationId } = request.params;

      const violation = await this.getViolationHandler.handle({ violationId, workspaceId });

      return ResponseHelper.ok(reply, 'Violation retrieved successfully', violation);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listViolations(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: {
        status?: ViolationStatus;
        userId?: string;
        expenseId?: string;
        policyId?: string;
        limit?: string;
        offset?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { status, userId, expenseId, policyId, limit, offset } = request.query;

      const result = await this.listViolationsHandler.handle({
        workspaceId,
        status,
        userId,
        expenseId,
        policyId,
        pagination: {
          limit: limit ? parseInt(limit, 10) : 50,
          offset: offset ? parseInt(offset, 10) : 0,
        },
      });

      return ResponseHelper.ok(reply, 'Violations retrieved successfully', {
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

  async getViolationStats(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { startDate?: string; endDate?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { startDate, endDate } = request.query;

      const stats = await this.getViolationStatsHandler.handle({
        workspaceId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      return ResponseHelper.ok(reply, 'Violation stats retrieved successfully', {
        total: stats.total,
        pending: stats.pendingCount,
        byStatus: stats.byStatus,
        bySeverity: stats.bySeverity,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async acknowledgeViolation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; violationId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, violationId } = request.params;
      const userId = request.user!.userId;

      const result = await this.acknowledgeViolationHandler.handle({
        violationId,
        workspaceId,
        acknowledgedBy: userId,
      });

      return ResponseHelper.fromCommand(reply, result, 'Violation acknowledged successfully');
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async resolveViolation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; violationId: string };
      Body: { resolutionNote?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, violationId } = request.params;
      const userId = request.user!.userId;

      const result = await this.resolveViolationHandler.handle({
        violationId,
        workspaceId,
        resolvedBy: userId,
        resolutionNote: request.body.resolutionNote,
      });

      return ResponseHelper.fromCommand(reply, result, 'Violation resolved successfully');
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async exemptViolation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; violationId: string };
      Body: { notes?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, violationId } = request.params;
      const userId = request.user!.userId;

      const result = await this.exemptViolationHandler.handle({
        violationId,
        workspaceId,
        exemptedBy: userId,
      });

      return ResponseHelper.fromCommand(reply, result, 'Violation exempted successfully');
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async overrideViolation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; violationId: string };
      Body: { overrideReason: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, violationId } = request.params;
      const userId = request.user!.userId;

      const result = await this.overrideViolationHandler.handle({
        violationId,
        workspaceId,
        overriddenBy: userId,
        overrideReason: request.body.overrideReason,
      });

      return ResponseHelper.fromCommand(reply, result, 'Violation overridden successfully');
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
