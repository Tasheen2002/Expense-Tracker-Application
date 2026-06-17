import { ScenarioService } from '../services/scenario.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface DeleteScenarioCommand extends ICommand {
  readonly id: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class DeleteScenarioHandler implements ICommandHandler<
  DeleteScenarioCommand,
  CommandResult<void>
> {
  constructor(private readonly scenarioService: ScenarioService) {}

  async handle(command: DeleteScenarioCommand): Promise<CommandResult<void>> {
    await this.scenarioService.deleteScenario(command.id, command.workspaceId, command.userId);
    return CommandResult.success();
  }
}
