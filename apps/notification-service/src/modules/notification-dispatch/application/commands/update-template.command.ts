import { TemplateAccess } from '../services/template-access';
import { TemplateService } from '../services/template.service';
import { NotificationTemplateDTO } from '../../domain/entities/notification-template.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface UpdateTemplateCommand extends ICommand {
  readonly access: TemplateAccess;
  readonly templateId: string;
  readonly subjectTemplate?: string;
  readonly bodyTemplate?: string;
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
    }, input.access);
    return CommandResult.success(dto);
  }
}
