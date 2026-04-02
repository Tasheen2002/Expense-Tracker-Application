import { CategorySuggestionService } from '../services/category-suggestion.service';
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id';
import { CategoryId } from '../../../expense-ledger/domain/value-objects/category-id';
import { ConfidenceScore } from '../../domain/value-objects/confidence-score';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface CreateSuggestionCommand extends ICommand {
  workspaceId: string;
  expenseId: string;
  suggestedCategoryId: string;
  confidence: number;
  reason?: string;
}

export class CreateSuggestionHandler implements ICommandHandler<
  CreateSuggestionCommand,
  CommandResult<{ suggestionId: string }>
> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(
    command: CreateSuggestionCommand
  ): Promise<CommandResult<{ suggestionId: string }>> {
    const suggestion = await this.suggestionService.createSuggestion({
      workspaceId: WorkspaceId.fromString(command.workspaceId),
      expenseId: ExpenseId.fromString(command.expenseId),
      suggestedCategoryId: CategoryId.fromString(command.suggestedCategoryId),
      confidence: ConfidenceScore.create(command.confidence),
      reason: command.reason,
    });

    return CommandResult.success({
      suggestionId: suggestion.getId().getValue(),
    });
  }
}
