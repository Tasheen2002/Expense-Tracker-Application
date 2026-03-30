import { TemplateService } from '../services/template.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface DeactivateTemplateCommand extends ICommand {
  templateId: string;
}

export class DeactivateTemplateHandler implements ICommandHandler<
  DeactivateTemplateCommand,
  CommandResult<void>
> {
  constructor(private readonly templateService: TemplateService) {}

  async handle(input: DeactivateTemplateCommand): Promise<CommandResult<void>> {
    try {
      await this.templateService.deactivateTemplate(input.templateId);
      return CommandResult.success();
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
