import { TemplateAccess } from '../services/template-access';
import { TemplateService } from '../services/template.service';
import { NotificationTemplateDTO } from '../../domain/entities/notification-template.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface DeactivateTemplateCommand extends ICommand {
  readonly access: TemplateAccess;
  readonly templateId: string;
}

export class DeactivateTemplateHandler implements ICommandHandler<
  DeactivateTemplateCommand,
  CommandResult<NotificationTemplateDTO>
> {
  constructor(private readonly templateService: TemplateService) {}

  async handle(input: DeactivateTemplateCommand): Promise<CommandResult<NotificationTemplateDTO>> {
    const dto = await this.templateService.deactivateTemplate(input.templateId, input.access);
    return CommandResult.success(dto);
  }
}
