import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";
import { ExemptionService } from "../../../application/services/exemption.service";
import { PolicyExemption } from "../../../domain/entities/policy-exemption.entity";
import { ExemptionStatus } from "../../../domain/enums/exemption-status.enum";

export class ExemptionController {
  constructor(private readonly exemptionService: ExemptionService) {}

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
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const requestedBy = request.user?.id;

      if (!requestedBy) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          error: "Unauthorized",
          message: "User not authenticated",
        });
      }

      const exemption = await this.exemptionService.requestExemption({
        workspaceId,
        policyId: request.body.policyId,
        userId: request.body.userId,
        requestedBy,
        reason: request.body.reason,
        startDate: new Date(request.body.startDate),
        endDate: new Date(request.body.endDate),
      });

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: "Exemption request created successfully",
        data: this.serializeExemption(exemption),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getExemption(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; exemptionId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, exemptionId } = request.params;

      const exemption = await this.exemptionService.getExemption(
        exemptionId,
        workspaceId,
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Exemption retrieved successfully",
        data: this.serializeExemption(exemption),
      });
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
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const { status, userId, policyId } = request.query;

      const exemptions = await this.exemptionService.listExemptions(
        workspaceId,
        {
          status,
          userId,
          policyId,
        },
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Exemptions retrieved successfully",
        data: exemptions.map((e) => this.serializeExemption(e)),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async approveExemption(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; exemptionId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, exemptionId } = request.params;
      const approvedBy = request.user?.id;

      if (!approvedBy) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          error: "Unauthorized",
          message: "User not authenticated",
        });
      }

      const exemption = await this.exemptionService.approveExemption(
        exemptionId,
        workspaceId,
        approvedBy,
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Exemption approved successfully",
        data: this.serializeExemption(exemption),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async rejectExemption(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; exemptionId: string };
      Body: { rejectionReason?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, exemptionId } = request.params;
      const rejectedBy = request.user?.id;

      if (!rejectedBy) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          error: "Unauthorized",
          message: "User not authenticated",
        });
      }

      const exemption = await this.exemptionService.rejectExemption(
        exemptionId,
        workspaceId,
        rejectedBy,
        request.body.rejectionReason,
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Exemption rejected successfully",
        data: this.serializeExemption(exemption),
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
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const { userId, policyId } = request.query;

      const exemption = await this.exemptionService.checkActiveExemption(
        workspaceId,
        userId,
        policyId,
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: exemption ? "Active exemption found" : "No active exemption",
        data: exemption ? this.serializeExemption(exemption) : null,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  private serializeExemption(exemption: PolicyExemption) {
    return {
      id: exemption.getId().getValue(),
      workspaceId: exemption.getWorkspaceId().getValue(),
      policyId: exemption.getPolicyId().getValue(),
      userId: exemption.getUserId(),
      status: exemption.getStatus(),
      reason: exemption.getReason(),
      requestedBy: exemption.getRequestedBy(),
      approvedBy: exemption.getApprovedBy(),
      approvedAt: exemption.getApprovedAt()?.toISOString(),
      rejectedBy: exemption.getRejectedBy(),
      rejectedAt: exemption.getRejectedAt()?.toISOString(),
      rejectionReason: exemption.getRejectionReason(),
      startDate: exemption.getStartDate().toISOString(),
      endDate: exemption.getEndDate().toISOString(),
      isActive: exemption.isActive(),
      createdAt: exemption.getCreatedAt().toISOString(),
      updatedAt: exemption.getUpdatedAt().toISOString(),
    };
  }
}
