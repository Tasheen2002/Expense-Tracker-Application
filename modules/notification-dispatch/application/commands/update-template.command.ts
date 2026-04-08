import { TemplateService } from '../services/template.service';
import { NotificationTemplateDTO } from '../../domain/entities/notification-template.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface UpdateTemplateCommand extends ICommand {
  templateId: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
}

export class UpdateTemplateHandler implements ICommandHandler<
  UpdateTemplateCommand,
  CommandResult<NotificationTemplateDTO>
> {
  constructor(private readonly templateService: TemplateService) {}

  async handle(input: UpdateTemplateCommand): Promise<CommandResult<NotificationTemplateDTO>> {
    const dto = await this.templateService.updateTemplate(input.templateId, {
      subjectTemplate: input.subjectTemplate,
      bodyTemplate: input.bodyTemplate,
    });
    return CommandResult.success(dto);
  }
}
