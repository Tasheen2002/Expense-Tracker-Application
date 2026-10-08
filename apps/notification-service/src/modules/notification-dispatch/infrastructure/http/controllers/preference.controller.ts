import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { NotificationType } from '../../../domain/enums/notification-type.enum';
import { ResponseHelper } from '@shared/response.helper';
import { GetPreferencesHandler } from '../../../application/queries/get-preferences.query';
import { UpdatePreferencesHandler } from '../../../application/commands/update-preferences.command';
import { UpdateTypePreferenceHandler } from '../../../application/commands/update-type-preference.command';
import { CheckChannelEnabledHandler } from '../../../application/queries/check-channel-enabled.query';
import {
  UpdateGlobalPreferencesInput,
  UpdateTypePreferenceInput,
  CheckChannelEnabledQuery,
} from '../validation/template.schema';

export class PreferenceController {
  constructor(
    private readonly getPreferencesHandler: Pick<GetPreferencesHandler, 'handle'>,
    private readonly updatePreferencesHandler: Pick<UpdatePreferencesHandler, 'handle'>,
    private readonly updateTypePreferenceHandler: Pick<UpdateTypePreferenceHandler, 'handle'>,
    private readonly checkChannelEnabledHandler: Pick<CheckChannelEnabledHandler, 'handle'>
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

      const preferences = await this.getPreferencesHandler.handle({
        userId,
        workspaceId,
      });
      // When no preferences exist yet, return safe defaults without persisting.
      // Preferences are created lazily on the first PATCH.
      const data = preferences
        ?? { id: null, userId, workspaceId, emailEnabled: true, inAppEnabled: true, pushEnabled: false, typeSettings: {} };
      return ResponseHelper.ok(
        reply,
        'Preferences retrieved successfully',
        data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateGlobalPreferences(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: UpdateGlobalPreferencesInput;
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
        'Preferences updated successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateTypePreference(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; type: NotificationType };
      Body: UpdateTypePreferenceInput;
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
        type,
        settings,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Type preference updated successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async checkChannelEnabled(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: CheckChannelEnabledQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { type, channel } = request.query;
      const userId = request.user.userId;

      const isEnabled = await this.checkChannelEnabledHandler.handle({
        userId,
        workspaceId,
        type,
        channel,
      });
      return ResponseHelper.ok(
        reply,
        'Channel status retrieved successfully',
        { type, channel, isEnabled }
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
