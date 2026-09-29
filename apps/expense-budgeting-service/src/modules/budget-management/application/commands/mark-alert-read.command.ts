import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';
import { BudgetAlertDTO } from '../../domain/entities/budget-alert.entity';
import { BudgetService } from '../services/budget.service';

export interface MarkAlertReadCommand extends ICommand {
  readonly alertId: string;
  readonly workspaceId: string;
}

export class MarkAlertReadHandler implements ICommandHandler<MarkAlertReadCommand, CommandResult<BudgetAlertDTO>> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(command: MarkAlertReadCommand): Promise<CommandResult<BudgetAlertDTO>> {
    const alert = await this.budgetService.markAlertAsRead(command.alertId, command.workspaceId);
    return CommandResult.success(alert);
  }
}
