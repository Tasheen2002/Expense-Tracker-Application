import { TemplateService } from '../services/template.service';
import { NotificationTemplateDTO } from '../../domain/entities/notification-template.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface ActivateTemplateCommand extends ICommand {
  readonly templateId: string;
}

export class ActivateTemplateHandler implements ICommandHandler<
  ActivateTemplateCommand,
  CommandResult<NotificationTemplateDTO>
> {
  constructor(private readonly templateService: TemplateService) {}

  async handle(input: ActivateTemplateCommand): Promise<CommandResult<NotificationTemplateDTO>> {
    const dto = await this.templateService.activateTemplate(input.templateId);
    return CommandResult.success(dto);
  }
}
