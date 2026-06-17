import { ScenarioService } from '../services/scenario.service';
import { ScenarioDTO } from '../../domain/entities/scenario.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface UpdateScenarioCommand extends ICommand {
  readonly id: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly name?: string;
  readonly description?: string;
  readonly assumptions?: Record<string, unknown>;
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
