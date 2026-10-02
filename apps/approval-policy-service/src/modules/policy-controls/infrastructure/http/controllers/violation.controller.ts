import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { ResponseHelper } from '@shared/response.helper';
import { getAuthenticatedActorId, extractAuthToken } from './controller.helper';
import {
  GetViolationHandler,
  ListViolationsHandler,
  GetViolationStatsHandler,
  AcknowledgeViolationHandler,
  ResolveViolationHandler,
  ExemptViolationHandler,
  OverrideViolationHandler,
  RecordViolationHandler,
} from '../../../application';
import {
  AcknowledgeViolationBody,
  ResolveViolationBody,
  OverrideViolationBody,
  ExemptViolationBody,
  ListViolationsQuery,
  GetViolationStatsQuery,
  RecordViolationBody,
} from '../validation/violation.schema';

export class ViolationController {
  constructor(
    private readonly getViolationHandler: GetViolationHandler,
    private readonly listViolationsHandler: ListViolationsHandler,
    private readonly getViolationStatsHandler: GetViolationStatsHandler,
    private readonly acknowledgeViolationHandler: AcknowledgeViolationHandler,
    private readonly resolveViolationHandler: ResolveViolationHandler,
    private readonly exemptViolationHandler: ExemptViolationHandler,
    private readonly overrideViolationHandler: OverrideViolationHandler,
    private readonly recordViolationHandler?: RecordViolationHandler
  ) {}

  async getViolation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; violationId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, violationId } = request.params;
      const actorId = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const violation = await this.getViolationHandler.handle({
        actorId,
        violationId,
        workspaceId,
        authToken,
      });

      return ResponseHelper.ok(reply, 'Violation retrieved successfully', violation);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listViolations(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: ListViolationsQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { status, userId, expenseId, policyId, limit, offset } = request.query;
      const actorId = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const result = await this.listViolationsHandler.handle({
        actorId,
        workspaceId,
        status,
        userId,
        expenseId,
        policyId,
        pagination: {
          limit,
          offset,
        },
        authToken,
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
      Querystring: GetViolationStatsQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { startDate, endDate } = request.query;
      const actorId = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const stats = await this.getViolationStatsHandler.handle({
        actorId,
        workspaceId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        authToken,
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
      Body: AcknowledgeViolationBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, violationId } = request.params;
      const userId = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);
      const note = request.body?.note;

      const result = await this.acknowledgeViolationHandler.handle({
        violationId,
        workspaceId,
        actorId: userId,
        acknowledgedBy: userId,
        note,
        authToken,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Violation acknowledged successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async resolveViolation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; violationId: string };
      Body: ResolveViolationBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, violationId } = request.params;
      const userId = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const result = await this.resolveViolationHandler.handle({
        violationId,
        workspaceId,
        actorId: userId,
        resolvedBy: userId,
        resolutionNote: request.body.resolutionNote,
        authToken,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Violation resolved successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async exemptViolation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; violationId: string };
      Body: ExemptViolationBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, violationId } = request.params;
      const userId = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const result = await this.exemptViolationHandler.handle({
        violationId,
        workspaceId,
        actorId: userId,
        exemptedBy: userId,
        exemptionId: request.body.exemptionId,
        authToken,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Violation exempted successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async overrideViolation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; violationId: string };
      Body: OverrideViolationBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, violationId } = request.params;
      const userId = getAuthenticatedActorId(request);
      const authToken = extractAuthToken(request);

      const result = await this.overrideViolationHandler.handle({
        violationId,
        workspaceId,
        actorId: userId,
        overriddenBy: userId,
        overrideReason: request.body.overrideReason,
        authToken,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Violation overridden successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async recordViolation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: RecordViolationBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      if (!this.recordViolationHandler) {
        throw new Error('RecordViolationHandler is not configured');
      }

      const { workspaceId } = request.params;
      const body = request.body;
      const actorId = request.user ? getAuthenticatedActorId(request) : undefined;
      const authToken = extractAuthToken(request);
      const servicePrincipal = request.servicePrincipal;

      const result = await this.recordViolationHandler.handle({
        workspaceId,
        actorId,
        servicePrincipal,
        authToken,
        policyId: body.policyId,
        expenseId: body.expenseId,
        userId: body.userId,
        severity: body.severity,
        violationDetails: body.violationDetails,
        expenseAmount: body.expenseAmount,
        currency: body.currency,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Violation recorded successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
