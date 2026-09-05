import { NotificationType } from '../../domain/enums/notification-type.enum';
import { NotificationChannel } from '../../domain/enums/notification-channel.enum';
import { NotificationTemplateDTO } from '../../domain/entities/notification-template.entity';
import { TemplateService } from '../services/template.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface CreateTemplateCommand extends ICommand {
  readonly workspaceId: string | undefined;
  readonly name: string;
  readonly type: NotificationType;
  readonly channel: NotificationChannel;
  readonly subjectTemplate: string;
  readonly bodyTemplate: string;
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
