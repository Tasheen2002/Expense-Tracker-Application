import { CategorySuggestionService } from '../services/category-suggestion.service';
import { CategorySuggestionDTO } from '../../domain/entities/category-suggestion.entity';
import {  WorkspaceId  } from '@core/domain/value-objects';
import {  ExpenseId, CategoryId  } from '@core/domain/value-objects';
import { ConfidenceScore } from '../../domain/value-objects/confidence-score';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface CreateSuggestionCommand extends ICommand {
  readonly workspaceId: string;
  readonly expenseId: string;
  readonly suggestedCategoryId: string;
  readonly confidence: number;
  readonly reason?: string;
}

export class CreateSuggestionHandler implements ICommandHandler<
  CreateSuggestionCommand,
  CommandResult<CategorySuggestionDTO>
> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(
    command: CreateSuggestionCommand
  ): Promise<CommandResult<CategorySuggestionDTO>> {
    const dto = await this.suggestionService.createSuggestion({
      workspaceId: WorkspaceId.fromString(command.workspaceId),
      expenseId: ExpenseId.fromString(command.expenseId),
      suggestedCategoryId: CategoryId.fromString(command.suggestedCategoryId),
      confidence: ConfidenceScore.create(command.confidence),
      reason: command.reason,
    });

    return CommandResult.success(dto);
  }
}
