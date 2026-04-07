import { ScenarioService } from '../services/scenario.service';
import { ScenarioDTO } from '../../domain/entities/scenario.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface UpdateScenarioCommand extends ICommand {
  id: string;
  workspaceId: string;
  userId: string;
  name?: string;
  description?: string;
  assumptions?: Record<string, unknown>;
}

export class UpdateScenarioHandler implements ICommandHandler<
  UpdateScenarioCommand,
  CommandResult<ScenarioDTO>
> {
  constructor(private readonly scenarioService: ScenarioService) {}

  async handle(command: UpdateScenarioCommand): Promise<CommandResult<ScenarioDTO>> {
    const dto = await this.scenarioService.updateScenario({
      id: command.id,
      workspaceId: command.workspaceId,
      userId: command.userId,
      name: command.name,
      description: command.description,
      assumptions: command.assumptions,
    });
    return CommandResult.success(dto);
  }
}
