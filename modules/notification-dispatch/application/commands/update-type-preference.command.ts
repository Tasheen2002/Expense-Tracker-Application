import { PreferenceService } from '../services/preference.service';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import { TypeSettingValue, NotificationPreferenceDTO } from '../../domain/entities/notification-preference.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface UpdateTypePreferenceCommand extends ICommand {
  readonly userId: string;
  readonly workspaceId: string;
  readonly type: NotificationType;
  readonly settings: TypeSettingValue;
}

export class UpdateTypePreferenceHandler implements ICommandHandler<
  UpdateTypePreferenceCommand,
  CommandResult<NotificationPreferenceDTO>
> {
  constructor(private readonly preferenceService: PreferenceService) {}

  async handle(
    input: UpdateTypePreferenceCommand
  ): Promise<CommandResult<NotificationPreferenceDTO>> {
    const dto = await this.preferenceService.updateTypePreference(
      input.userId,
      input.workspaceId,
      input.type,
      input.settings
    );
    return CommandResult.success(dto);
  }
}
