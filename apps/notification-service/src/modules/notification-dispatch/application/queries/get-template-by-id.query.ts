import { TemplateService } from '../services/template.service';
import { NotificationTemplateDTO } from '../../domain/entities/notification-template.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetTemplateByIdQuery extends IQuery {
  readonly templateId: string;
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
