import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { NotificationType } from '../../../domain/enums/notification-type.enum';
import { NotificationChannel } from '../../../domain/enums/notification-channel.enum';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';
import { CreateTemplateHandler } from '../../../application/commands/create-template.command';
import { UpdateTemplateHandler } from '../../../application/commands/update-template.command';
import { ActivateTemplateHandler } from '../../../application/commands/activate-template.command';
import { DeactivateTemplateHandler } from '../../../application/commands/deactivate-template.command';
import { GetTemplateByIdHandler } from '../../../application/queries/get-template-by-id.query';
import { GetActiveTemplateHandler } from '../../../application/queries/get-active-template.query';

export class TemplateController {
  constructor(
    private readonly createTemplateHandler: CreateTemplateHandler,
    private readonly getTemplateByIdHandler: GetTemplateByIdHandler,
    private readonly getActiveTemplateHandler: GetActiveTemplateHandler,
    private readonly updateTemplateHandler: UpdateTemplateHandler,
    private readonly activateTemplateHandler: ActivateTemplateHandler,
    private readonly deactivateTemplateHandler: DeactivateTemplateHandler
  ) {}

  async createTemplate(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const {
        workspaceId,
        name,
        type,
        channel,
        subjectTemplate,
        bodyTemplate,
      } = request.body as {
        workspaceId?: string;
        name: string;
        type: string;
        channel: string;
        subjectTemplate: string;
        bodyTemplate: string;
      };

      const result = await this.createTemplateHandler.handle({
        workspaceId,
        name,
        type: type as NotificationType,
        channel: channel as NotificationChannel,
        subjectTemplate,
        bodyTemplate,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Template created successfully',
        result.data,
        201
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getTemplateById(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { templateId } = request.params as { templateId: string };

      const result = await this.getTemplateByIdHandler.handle({ templateId });
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Template retrieved successfully',
        result.data ? result.data.toJSON() : undefined
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getActiveTemplate(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { workspaceId, type, channel } = request.query as {
        workspaceId?: string;
        type: string;
        channel: string;
      };

      const result = await this.getActiveTemplateHandler.handle({
        workspaceId,
        type: type as NotificationType,
        channel: channel as NotificationChannel,
      });

      if (!result.data) {
        return ResponseHelper.notFound(
          reply,
          'No active template found for this type and channel'
        );
      }

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Active template retrieved successfully',
        result.data.toJSON()
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateTemplate(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { templateId } = request.params as { templateId: string };
      const { subjectTemplate, bodyTemplate } = request.body as {
        subjectTemplate?: string;
        bodyTemplate?: string;
      };

      const result = await this.updateTemplateHandler.handle({
        templateId,
        subjectTemplate,
        bodyTemplate,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Template updated successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateTemplate(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { templateId } = request.params as { templateId: string };

      const result = await this.activateTemplateHandler.handle({ templateId });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Template activated successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deactivateTemplate(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { templateId } = request.params as { templateId: string };

      const result = await this.deactivateTemplateHandler.handle({
        templateId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Template deactivated successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
