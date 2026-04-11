import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';
import { TagService } from '../services/tag.service';
import { TagDTO } from '../../domain/entities/tag.entity';
import { TagNotFoundError } from '../../domain/errors/expense.errors';

export interface GetTagQuery extends IQuery {
  readonly tagId: string;
  readonly workspaceId: string;
}

export class GetTagHandler implements IQueryHandler<GetTagQuery, TagDTO> {
  constructor(private readonly tagService: TagService) {}

  async handle(query: GetTagQuery): Promise<TagDTO> {
    const tag = await this.tagService.getTagById(
      query.tagId,
      query.workspaceId
    );

    if (!tag) {
      throw new TagNotFoundError(query.tagId, query.workspaceId);
    }

    return tag;
  }
}
