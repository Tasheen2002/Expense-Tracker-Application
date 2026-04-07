import { NotificationType } from '../../domain/enums/notification-type.enum';
import { NotificationChannel } from '../../domain/enums/notification-channel.enum';
import { NotificationTemplateDTO } from '../../domain/entities/notification-template.entity';
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
  CommandResult<NotificationTemplateDTO>
> {
  constructor(private readonly templateService: TemplateService) {}

  async handle(
    input: CreateTemplateCommand
  ): Promise<CommandResult<NotificationTemplateDTO>> {
    const dto = await this.templateService.createTemplate({
      workspaceId: input.workspaceId,
      name: input.name,
      type: input.type,
      channel: input.channel,
      subjectTemplate: input.subjectTemplate,
      bodyTemplate: input.bodyTemplate,
    });
    return CommandResult.success(dto);
  }
}
