import { NotificationType } from '../../domain/enums/notification-type.enum';
import { NotificationChannel } from '../../domain/enums/notification-channel.enum';
import { TemplateService } from '../services/template.service';
import { NotificationTemplate } from '../../domain/entities/notification-template.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetActiveTemplateQuery extends IQuery {
  workspaceId: string | undefined;
  type: NotificationType;
  channel: NotificationChannel;
}

export class GetActiveTemplateHandler implements IQueryHandler<
  GetActiveTemplateQuery,
  QueryResult<NotificationTemplate | null>
> {
  constructor(private readonly templateService: TemplateService) {}

  async handle(
    input: GetActiveTemplateQuery
  ): Promise<QueryResult<NotificationTemplate | null>> {
    try {
      const template = await this.templateService.getActiveTemplate(
        input.workspaceId,
        input.type,
        input.channel
      );
      return QueryResult.success(template);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
