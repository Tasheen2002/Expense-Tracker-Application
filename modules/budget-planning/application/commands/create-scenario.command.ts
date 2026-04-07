import { ScenarioService } from '../services/scenario.service';
import { ScenarioDTO } from '../../domain/entities/scenario.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface CreateScenarioCommand extends ICommand {
  planId: string;
  workspaceId: string;
  name: string;
  createdBy: string;
  description?: string;
  assumptions?: Record<string, unknown>;
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
