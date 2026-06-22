import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
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

      const preferences = await this.getPreferencesHandler.handle({
        userId,
        workspaceId,
      });
      // When no preferences exist yet, return safe defaults without persisting.
      // Preferences are created lazily on the first PATCH.
      const data = preferences
        ?? { emailEnabled: true, inAppEnabled: true, pushEnabled: false };
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
      Params: { workspaceId: string; type: string };
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
        type: type as NotificationType,
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

      console.log('DEBUG CHECK:', { workspaceId, userId, query: request.query });

      const isEnabled = await this.checkChannelEnabledHandler.handle({
        userId,
        workspaceId,
        type: type as NotificationType,
        channel,
      });
      return ResponseHelper.ok(
        reply,
        'Channel status retrieved successfully',
        { type, channel, isEnabled }
      );
    } catch (error: unknown) {
      console.error('DEBUG checkChannelEnabled error:', error);
      return ResponseHelper.error(reply, error);
    }
  }
}

