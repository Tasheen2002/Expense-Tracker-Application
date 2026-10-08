import { IWorkspaceAccessPort } from '../ports/workspace-access.port';
import { ICategorizationReferencePort } from '../ports/categorization-reference.port';
import { authorizeWorkspaceWrite } from './authorize-workspace-write';
import { CategorySuggestionService } from '../services/category-suggestion.service';
import { CategorySuggestionDTO } from '../../domain/entities/category-suggestion.entity';
import { WorkspaceId, UserId } from '@core/domain/value-objects';
import {  ExpenseId, CategoryId  } from '@core/domain/value-objects';
import { ConfidenceScore } from '../../domain/value-objects/confidence-score';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface CreateSuggestionCommand extends ICommand {
  readonly workspaceId: string;
  readonly userId: string;
  readonly expenseId: string;
  readonly suggestedCategoryId: string;
  readonly confidence: number;
  readonly reason?: string;
}

export class CreateSuggestionHandler implements ICommandHandler<
  CreateSuggestionCommand,
  CommandResult<CategorySuggestionDTO>
> {
  constructor(private readonly suggestionService: Pick<CategorySuggestionService, 'createSuggestion'>, private readonly workspaceAccess: IWorkspaceAccessPort, private readonly references: ICategorizationReferencePort) {}

  async handle(
    command: CreateSuggestionCommand
  ): Promise<CommandResult<CategorySuggestionDTO>> {
    const workspaceId = WorkspaceId.fromString(command.workspaceId);
    await authorizeWorkspaceWrite(command.userId, workspaceId, this.workspaceAccess);
    const expenseId = ExpenseId.fromString(command.expenseId);
    const suggestedCategoryId = CategoryId.fromString(command.suggestedCategoryId);
    const [snapshot] = await Promise.all([
      this.references.readExpense({ workspaceId: workspaceId.getValue(), expenseId: expenseId.getValue(), userId: command.userId }),
      this.references.ensureCategory({ workspaceId: workspaceId.getValue(), categoryId: suggestedCategoryId.getValue(), userId: command.userId }),
    ]);
    const dto = await this.suggestionService.createSuggestion({
      workspaceId: workspaceId,
      expenseOwnerId: UserId.fromString(snapshot.expenseOwnerId),
      expenseId,
      suggestedCategoryId,
      confidence: ConfidenceScore.create(command.confidence),
      reason: command.reason,
    });

    return CommandResult.success(dto);
  }
}
