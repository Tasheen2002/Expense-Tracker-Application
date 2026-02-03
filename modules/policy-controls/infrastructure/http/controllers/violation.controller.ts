import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";
import { ViolationService } from "../../../application/services/violation.service";
import { PolicyViolation } from "../../../domain/entities/policy-violation.entity";
import { ViolationStatus } from "../../../domain/enums/violation-status.enum";

export class ViolationController {
  constructor(private readonly violationService: ViolationService) {}

  async getViolation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; violationId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, violationId } = request.params;

      const violation = await this.violationService.getViolation(
        violationId,
        workspaceId,
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Violation retrieved successfully",
        data: this.serializeViolation(violation),
      });
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
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const { status, userId, expenseId, policyId } = request.query;

      const violations = await this.violationService.listViolations(
        workspaceId,
        {
          status,
          userId,
          expenseId,
          policyId,
        },
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Violations retrieved successfully",
        data: violations.map((v) => this.serializeViolation(v)),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getViolationStats(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { status?: ViolationStatus };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const { status } = request.query;

      const count = await this.violationService.countViolations(
        workspaceId,
        status ? { status } : undefined,
      );

      const pendingCount = await this.violationService.countViolations(
        workspaceId,
        { status: ViolationStatus.PENDING },
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Violation stats retrieved successfully",
        data: { total: count, pending: pendingCount },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async acknowledgeViolation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; violationId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, violationId } = request.params;
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          error: "Unauthorized",
          message: "User not authenticated",
        });
      }

      const violation = await this.violationService.acknowledgeViolation(
        violationId,
        workspaceId,
        userId,
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Violation acknowledged successfully",
        data: this.serializeViolation(violation),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async resolveViolation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; violationId: string };
      Body: { resolutionNote?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, violationId } = request.params;
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          error: "Unauthorized",
          message: "User not authenticated",
        });
      }

      const violation = await this.violationService.resolveViolation(
        violationId,
        workspaceId,
        userId,
        request.body.resolutionNote,
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Violation resolved successfully",
        data: this.serializeViolation(violation),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async exemptViolation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; violationId: string };
      Body: { notes?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, violationId } = request.params;
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          error: "Unauthorized",
          message: "User not authenticated",
        });
      }

      const violation = await this.violationService.exemptViolation(
        violationId,
        workspaceId,
        userId,
        request.body.notes,
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Violation exempted successfully",
        data: this.serializeViolation(violation),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async overrideViolation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; violationId: string };
      Body: { overrideReason: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, violationId } = request.params;
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          error: "Unauthorized",
          message: "User not authenticated",
        });
      }

      const violation = await this.violationService.overrideViolation(
        violationId,
        workspaceId,
        userId,
        request.body.overrideReason,
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Violation overridden successfully",
        data: this.serializeViolation(violation),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  private serializeViolation(violation: PolicyViolation) {
    return {
      id: violation.getId().getValue(),
      workspaceId: violation.getWorkspaceId().getValue(),
      policyId: violation.getPolicyId().getValue(),
      expenseId: violation.getExpenseId(),
      userId: violation.getUserId(),
      status: violation.getStatus(),
      severity: violation.getSeverity(),
      violationDetails: violation.getViolationDetails(),
      expenseAmount: violation.getExpenseAmount(),
      currency: violation.getCurrency(),
      acknowledgedAt: violation.getAcknowledgedAt()?.toISOString(),
      acknowledgedBy: violation.getAcknowledgedBy(),
      resolvedAt: violation.getResolvedAt()?.toISOString(),
      resolvedBy: violation.getResolvedBy(),
      resolutionNotes: violation.getResolutionNotes(),
      createdAt: violation.getCreatedAt().toISOString(),
      updatedAt: violation.getUpdatedAt().toISOString(),
    };
  }
}
