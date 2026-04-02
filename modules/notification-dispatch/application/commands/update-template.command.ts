import { TemplateService } from '../services/template.service';
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
  CommandResult<void>
> {
  constructor(private readonly templateService: TemplateService) {}

  async handle(input: UpdateTemplateCommand): Promise<CommandResult<void>> {
    try {
      await this.templateService.updateTemplate(input.templateId, {
        subjectTemplate: input.subjectTemplate,
        bodyTemplate: input.bodyTemplate,
      });
      return CommandResult.success();
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
