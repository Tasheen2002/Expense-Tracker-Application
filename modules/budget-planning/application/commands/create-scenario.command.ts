import { ScenarioService } from '../services/scenario.service';
import { ScenarioDTO } from '../../domain/entities/scenario.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface CreateScenarioCommand extends ICommand {
  readonly planId: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly createdBy: string;
  readonly description?: string;
  readonly assumptions?: Record<string, unknown>;
}

export class CreateScenarioHandler implements ICommandHandler<
  CreateScenarioCommand,
  CommandResult<ScenarioDTO>
> {
  constructor(private readonly scenarioService: ScenarioService) {}

  async handle(
    command: CreateScenarioCommand
  ): Promise<CommandResult<ScenarioDTO>> {
    const scenario = await this.scenarioService.createScenario({
      planId: command.planId,
      workspaceId: command.workspaceId,
      name: command.name,
      description: command.description,
      assumptions: command.assumptions,
      createdBy: command.createdBy,
    });
    return CommandResult.success(scenario);
  }
}
