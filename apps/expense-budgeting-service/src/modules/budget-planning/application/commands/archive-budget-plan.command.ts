import { BudgetPlanService } from '../services/budget-plan.service';
import { BudgetPlanDTO } from '../../domain/entities/budget-plan.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface ArchiveBudgetPlanCommand extends ICommand {
  readonly id: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class ArchiveBudgetPlanHandler implements ICommandHandler<
  ArchiveBudgetPlanCommand,
  CommandResult<BudgetPlanDTO>
> {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(
    command: ArchiveBudgetPlanCommand
  ): Promise<CommandResult<BudgetPlanDTO>> {
    const dto = await this.budgetPlanService.archivePlan(command.id, command.workspaceId, command.userId);
    return CommandResult.success(dto);
  }
}
