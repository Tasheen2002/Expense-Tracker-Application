import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { ResponseHelper } from '@shared/response.helper';
import { TemplateAccess } from '../../../application/services/template-access';
import { TemplateAccessDeniedError } from '../../../domain/errors/notification.errors';

function templateAccess(request: AuthenticatedRequest): TemplateAccess {
  if (!request.workspaceMembership) throw new TemplateAccessDeniedError();
  return { userId: request.user.userId, workspaceId: request.workspaceMembership.workspaceId, role: request.workspaceMembership.role };
}
import { CreateTemplateHandler } from '../../../application/commands/create-template.command';
import { UpdateTemplateHandler } from '../../../application/commands/update-template.command';
import { ActivateTemplateHandler } from '../../../application/commands/activate-template.command';
import { DeactivateTemplateHandler } from '../../../application/commands/deactivate-template.command';
import { GetTemplateByIdHandler } from '../../../application/queries/get-template-by-id.query';
import { GetActiveTemplateHandler } from '../../../application/queries/get-active-template.query';
import {
  CreateTemplateInput,
  UpdateTemplateInput,
  GetActiveTemplateQuery,
} from '../validation/template.schema';

export class TemplateController {
  constructor(
    private readonly createTemplateHandler: Pick<CreateTemplateHandler, 'handle'>,
    private readonly getTemplateByIdHandler: Pick<GetTemplateByIdHandler, 'handle'>,
    private readonly getActiveTemplateHandler: Pick<GetActiveTemplateHandler, 'handle'>,
    private readonly updateTemplateHandler: Pick<UpdateTemplateHandler, 'handle'>,
    private readonly activateTemplateHandler: Pick<ActivateTemplateHandler, 'handle'>,
    private readonly deactivateTemplateHandler: Pick<DeactivateTemplateHandler, 'handle'>
  ) {}

  async createTemplate(
    request: AuthenticatedRequest<{
      Body: CreateTemplateInput;
    }>,
    reply: FastifyReply
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

      const result = await this.createTemplateHandler.handle({
        access: templateAccess(request),
        workspaceId,
        name,
        type,
        channel,
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
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getTemplateById(
    request: AuthenticatedRequest<{
      Params: { templateId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { templateId } = request.params;

      const template = await this.getTemplateByIdHandler.handle({ templateId, access: templateAccess(request) });
      return ResponseHelper.ok(
        reply,
        'Template retrieved successfully',
        template
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getActiveTemplate(
    request: AuthenticatedRequest<{
      Querystring: GetActiveTemplateQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, type, channel } = request.query;

      const template = await this.getActiveTemplateHandler.handle({
        access: templateAccess(request),
        workspaceId,
        type,
        channel,
      });

      if (!template) {
        return ResponseHelper.notFound(
          reply,
          'No active template found for this type and channel'
        );
      }

      return ResponseHelper.ok(
        reply,
        'Active template retrieved successfully',
        template
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateTemplate(
    request: AuthenticatedRequest<{
      Params: { templateId: string };
      Body: UpdateTemplateInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { templateId } = request.params;
      const { subjectTemplate, bodyTemplate } = request.body;

      const result = await this.updateTemplateHandler.handle({
        access: templateAccess(request),
        templateId,
        subjectTemplate,
        bodyTemplate,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Template updated successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateTemplate(
    request: AuthenticatedRequest<{
      Params: { templateId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { templateId } = request.params;

      const result = await this.activateTemplateHandler.handle({ templateId, access: templateAccess(request) });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Template activated successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deactivateTemplate(
    request: AuthenticatedRequest<{
      Params: { templateId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { templateId } = request.params;

      const result = await this.deactivateTemplateHandler.handle({
        access: templateAccess(request),
        templateId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Template deactivated successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
