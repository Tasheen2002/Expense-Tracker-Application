import { TemplateService } from '../services/template.service';
import { NotificationTemplateDTO } from '../../domain/entities/notification-template.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface GetTemplateByIdQuery extends IQuery {
  templateId: string;
}

export class GetTemplateByIdHandler implements IQueryHandler<
  GetTemplateByIdQuery,
  NotificationTemplateDTO
> {
  constructor(private readonly templateService: TemplateService) {}

  async handle(
    input: GetTemplateByIdQuery
  ): Promise<NotificationTemplateDTO> {
    return this.templateService.getTemplateById(input.templateId);
  }
}
