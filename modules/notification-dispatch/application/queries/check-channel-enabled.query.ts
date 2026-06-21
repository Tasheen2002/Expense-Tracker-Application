import { PreferenceService } from '../services/preference.service';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface CheckChannelEnabledQuery extends IQuery {
  readonly userId: string;
  readonly workspaceId: string;
  readonly type: NotificationType;
  readonly channel: 'email' | 'inApp' | 'push';
}

export class CheckChannelEnabledHandler implements IQueryHandler<
  CheckChannelEnabledQuery,
  boolean
> {
  constructor(private readonly preferenceService: PreferenceService) {}

  async handle(input: CheckChannelEnabledQuery): Promise<boolean> {
    return this.preferenceService.isChannelEnabled(
      input.userId,
      input.workspaceId,
      input.type,
      input.channel
    );
  }
}
