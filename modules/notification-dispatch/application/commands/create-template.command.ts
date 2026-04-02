import { NotificationType } from '../../domain/enums/notification-type.enum';
import { NotificationChannel } from '../../domain/enums/notification-channel.enum';
import { TemplateService } from '../services/template.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface CreateTemplateCommand extends ICommand {
  workspaceId: string | undefined;
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  subjectTemplate: string;
  bodyTemplate: string;
}

export class CreateTemplateHandler implements ICommandHandler<
  CreateTemplateCommand,
  CommandResult<{ templateId: string }>
> {
  constructor(private readonly templateService: TemplateService) {}

  async handle(
    input: CreateTemplateCommand
  ): Promise<CommandResult<{ templateId: string }>> {
    try {
      const template = await this.templateService.createTemplate({
        workspaceId: input.workspaceId,
        name: input.name,
        type: input.type,
        channel: input.channel,
        subjectTemplate: input.subjectTemplate,
        bodyTemplate: input.bodyTemplate,
      });
      return CommandResult.success({ templateId: template.getId().getValue() });
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
