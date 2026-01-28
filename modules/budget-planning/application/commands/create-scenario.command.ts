import { ScenarioService } from "../services/scenario.service";
import { Scenario } from "../../domain/entities/scenario.entity";

export class CreateScenarioCommand {
  constructor(
    public readonly planId: string,
    public readonly name: string,
    public readonly createdBy: string,
    public readonly description?: string,
    public readonly assumptions?: Record<string, any>,
  ) {}
}

export class CreateScenarioHandler {
  constructor(private readonly scenarioService: ScenarioService) {}

  async handle(command: CreateScenarioCommand): Promise<Scenario> {
    return await this.scenarioService.createScenario({
      planId: command.planId,
      name: command.name,
      description: command.description,
      assumptions: command.assumptions,
      createdBy: command.createdBy,
    });
  }
}
