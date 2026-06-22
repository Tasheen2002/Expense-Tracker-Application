import { NotificationType } from '../../domain/enums/notification-type.enum';
import { NotificationChannel } from '../../domain/enums/notification-channel.enum';
import { TemplateService } from '../services/template.service';
import { NotificationTemplateDTO } from '../../domain/entities/notification-template.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetActiveTemplateQuery extends IQuery {
  readonly workspaceId: string | undefined;
  readonly type: NotificationType;
  readonly channel: NotificationChannel;
}

export class GetActiveTemplateHandler implements IQueryHandler<
  GetActiveTemplateQuery,
  NotificationTemplateDTO | null
> {
  constructor(private readonly templateService: TemplateService) {}

  async handle(
    input: GetActiveTemplateQuery
  ): Promise<NotificationTemplateDTO | null> {
    return this.templateService.getActiveTemplate(
      input.workspaceId,
      input.type,
      input.channel
    );
  }
}
