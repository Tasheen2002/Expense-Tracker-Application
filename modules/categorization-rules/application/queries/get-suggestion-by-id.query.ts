import { CategorySuggestionService } from '../services/category-suggestion.service';
import { SuggestionId } from '../../domain/value-objects/suggestion-id';
import { WorkspaceId } from '../../../identity-workspace';
import { CategorySuggestionDTO } from '../../domain/entities/category-suggestion.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetSuggestionByIdQuery extends IQuery {
  readonly suggestionId: string;
  readonly workspaceId: string;
}

export class GetSuggestionByIdHandler implements IQueryHandler<
  GetSuggestionByIdQuery,
  CategorySuggestionDTO
> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(query: GetSuggestionByIdQuery): Promise<CategorySuggestionDTO> {
    return this.suggestionService.getSuggestionById(
      SuggestionId.fromString(query.suggestionId),
      WorkspaceId.fromString(query.workspaceId)
    );
  }
}
