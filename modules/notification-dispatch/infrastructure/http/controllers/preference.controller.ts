import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import {
  NotificationPreference,
  TypeSettingValue,
} from '../../../domain/entities/notification-preference.entity';
import { NotificationType } from '../../../domain/enums/notification-type.enum';
import type { GlobalPreferenceSettings } from '../../../application/services/preference.service';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';
import { GetPreferencesHandler } from '../../../application/queries/get-preferences.query';
import { UpdatePreferencesHandler } from '../../../application/commands/update-preferences.command';
import { UpdateTypePreferenceHandler } from '../../../application/commands/update-type-preference.command';
import { CheckChannelEnabledHandler } from '../../../application/queries/check-channel-enabled.query';

export class PreferenceController {
  constructor(
    private readonly getPreferencesHandler: GetPreferencesHandler,
    private readonly updatePreferencesHandler: UpdatePreferencesHandler,
    private readonly updateTypePreferenceHandler: UpdateTypePreferenceHandler,
    private readonly checkChannelEnabledHandler: CheckChannelEnabledHandler
  ) {}

  async getPreferences(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const userId = request.user.userId;

      const result = await this.getPreferencesHandler.handle({
        userId,
        workspaceId,
      });
      // When no preferences exist yet, return safe defaults without persisting.
      // Preferences are created lazily on the first PATCH.
      const data = result.data
        ? result.data.toJSON()
        : { emailEnabled: true, inAppEnabled: true, pushEnabled: false };
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Preferences retrieved successfully',
        data
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateGlobalPreferences(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: GlobalPreferenceSettings;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const userId = request.user.userId;
      const settings = request.body;

      const result = await this.updatePreferencesHandler.handle({
        userId,
        workspaceId,
        settings,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Preferences updated successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateTypePreference(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; type: string };
      Body: TypeSettingValue;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, type } = request.params;
      const userId = request.user.userId;
      const settings = request.body;

      const result = await this.updateTypePreferenceHandler.handle({
        userId,
        workspaceId,
        type: type as NotificationType,
        settings,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Type preference updated successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async checkChannelEnabled(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { type: string; channel: 'email' | 'inApp' | 'push' };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { type, channel } = request.query;
      const userId = request.user.userId;

      const result = await this.checkChannelEnabledHandler.handle({
        userId,
        workspaceId,
        type: type as NotificationType,
        channel,
      });
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Channel status retrieved successfully',
        { type, channel, isEnabled: result.data ?? false }
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
