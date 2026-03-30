import { ScenarioService } from '../services/scenario.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface DeleteScenarioCommand extends ICommand {
  id: string;
  userId: string;
}

export class DeleteScenarioHandler implements ICommandHandler<
  DeleteScenarioCommand,
  CommandResult<void>
> {
  constructor(private readonly scenarioService: ScenarioService) {}

  async handle(command: DeleteScenarioCommand): Promise<CommandResult<void>> {
    await this.scenarioService.deleteScenario(command.id, command.userId);
    return CommandResult.success();
  }
}
