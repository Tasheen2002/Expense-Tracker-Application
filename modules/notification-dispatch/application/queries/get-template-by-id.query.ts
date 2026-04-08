import { TemplateService } from '../services/template.service';
import { NotificationTemplateDTO } from '../../domain/entities/notification-template.entity';
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
  QueryResult<NotificationTemplateDTO>
> {
  constructor(private readonly templateService: TemplateService) {}

  async handle(
    input: GetTemplateByIdQuery
  ): Promise<QueryResult<NotificationTemplateDTO>> {
    const template = await this.templateService.getTemplateById(
      input.templateId
    );
    return QueryResult.success(template);
  }
}
