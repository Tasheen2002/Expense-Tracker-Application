import { TemplateService } from '../services/template.service';
import { NotificationTemplateDTO } from '../../domain/entities/notification-template.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface DeactivateTemplateCommand extends ICommand {
  templateId: string;
}

export class DeactivateTemplateHandler implements ICommandHandler<
  DeactivateTemplateCommand,
  CommandResult<NotificationTemplateDTO>
> {
  constructor(private readonly templateService: TemplateService) {}

  async handle(input: DeactivateTemplateCommand): Promise<CommandResult<NotificationTemplateDTO>> {
    const dto = await this.templateService.deactivateTemplate(input.templateId);
    return CommandResult.success(dto);
  }
}
