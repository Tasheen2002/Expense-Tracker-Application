import { ScenarioService } from '../services/scenario.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface CreateScenarioCommand extends ICommand {
  planId: string;
  name: string;
  createdBy: string;
  description?: string;
  assumptions?: Record<string, any>;
}

export class CreateScenarioHandler implements ICommandHandler<
  CreateScenarioCommand,
  CommandResult<{ scenarioId: string }>
> {
  constructor(private readonly scenarioService: ScenarioService) {}

  async handle(
    command: CreateScenarioCommand
  ): Promise<CommandResult<{ scenarioId: string }>> {
    const scenario = await this.scenarioService.createScenario({
      planId: command.planId,
      name: command.name,
      description: command.description,
      assumptions: command.assumptions,
      createdBy: command.createdBy,
    });
    return CommandResult.success({ scenarioId: scenario.getId().getValue() });
  }
}
