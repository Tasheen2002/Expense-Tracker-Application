import { FastifyRequest, FastifyReply } from "fastify";
import { TemplateService } from "../../../application/services/template.service";
import { NotificationTemplate } from "../../../domain/entities/notification-template.entity";
import { NotificationType } from "../../../domain/enums/notification-type.enum";
import { NotificationChannel } from "../../../domain/enums/notification-channel.enum";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";

export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  async createTemplate(
    request: FastifyRequest<{
      Body: {
        workspaceId?: string;
        name: string;
        type: string;
        channel: string;
        subjectTemplate: string;
        bodyTemplate: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const {
        workspaceId,
        name,
        type,
        channel,
        subjectTemplate,
        bodyTemplate,
      } = request.body;

      const template = await this.templateService.createTemplate({
        workspaceId,
        name,
        type: type as NotificationType,
        channel: channel as NotificationChannel,
        subjectTemplate,
        bodyTemplate,
      });

      return ResponseHelper.success(
        reply,
        201,
        "Template created successfully",
        this.serializeTemplate(template),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getTemplateById(
    request: FastifyRequest<{
      Params: { templateId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { templateId } = request.params;
      const template = await this.templateService.getTemplateById(templateId);

      return ResponseHelper.success(
        reply,
        200,
        "Template retrieved successfully",
        this.serializeTemplate(template),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getActiveTemplate(
    request: FastifyRequest<{
      Querystring: {
        workspaceId?: string;
        type: string;
        channel: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, type, channel } = request.query;

      const template = await this.templateService.getActiveTemplate(
        workspaceId,
        type as NotificationType,
        channel as NotificationChannel,
      );

      if (!template) {
        return ResponseHelper.notFound(
          reply,
          "No active template found for this type and channel",
        );
      }

      return ResponseHelper.success(
        reply,
        200,
        "Active template retrieved successfully",
        this.serializeTemplate(template),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateTemplate(
    request: FastifyRequest<{
      Params: { templateId: string };
      Body: { subjectTemplate?: string; bodyTemplate?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { templateId } = request.params;
      const { subjectTemplate, bodyTemplate } = request.body;

      const template = await this.templateService.updateTemplate(templateId, {
        subjectTemplate,
        bodyTemplate,
      });

      return ResponseHelper.success(
        reply,
        200,
        "Template updated successfully",
        this.serializeTemplate(template),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateTemplate(
    request: FastifyRequest<{
      Params: { templateId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { templateId } = request.params;
      const template = await this.templateService.activateTemplate(templateId);

      return ResponseHelper.success(
        reply,
        200,
        "Template activated successfully",
        {
          isActive: template.isActiveTemplate(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deactivateTemplate(
    request: FastifyRequest<{
      Params: { templateId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { templateId } = request.params;
      const template =
        await this.templateService.deactivateTemplate(templateId);

      return ResponseHelper.success(
        reply,
        200,
        "Template deactivated successfully",
        {
          isActive: template.isActiveTemplate(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  private serializeTemplate(template: NotificationTemplate) {
    return {
      id: template.getId().getValue(),
      workspaceId: template.getWorkspaceId()?.getValue() || null,
      name: template.getName(),
      type: template.getType(),
      channel: template.getChannel(),
      subjectTemplate: template.getSubjectTemplate(),
      bodyTemplate: template.getBodyTemplate(),
      isActive: template.isActiveTemplate(),
      createdAt: template.getCreatedAt().toISOString(),
      updatedAt: template.getUpdatedAt().toISOString(),
    };
  }
}
