import { TemplateService } from '../services/template.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface ActivateTemplateCommand extends ICommand {
  templateId: string;
}

export class ActivateTemplateHandler implements ICommandHandler<
  ActivateTemplateCommand,
  CommandResult<void>
> {
  constructor(private readonly templateService: TemplateService) {}

  async handle(input: ActivateTemplateCommand): Promise<CommandResult<void>> {
    try {
      await this.templateService.activateTemplate(input.templateId);
      return CommandResult.success();
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
