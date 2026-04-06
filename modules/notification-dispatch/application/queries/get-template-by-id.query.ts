import { TemplateService } from '../services/template.service';
import { NotificationTemplate } from '../../domain/entities/notification-template.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetTemplateByIdQuery extends IQuery {
  templateId: string;
}

export class GetTemplateByIdHandler implements IQueryHandler<
  GetTemplateByIdQuery,
  QueryResult<NotificationTemplate>
> {
  constructor(private readonly templateService: TemplateService) {}

  async handle(
    input: GetTemplateByIdQuery
  ): Promise<QueryResult<NotificationTemplate>> {
    try {
      const template = await this.templateService.getTemplateById(
        input.templateId
      );
      return QueryResult.success(template);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
