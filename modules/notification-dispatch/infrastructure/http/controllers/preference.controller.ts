import { FastifyRequest, FastifyReply } from "fastify";
import {
  PreferenceService,
  GlobalPreferenceSettings,
} from "../../../application/services/preference.service";
import {
  NotificationPreference,
  TypeSettingValue,
} from "../../../domain/entities/notification-preference.entity";
import { NotificationType } from "../../../domain/enums/notification-type.enum";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";

export class PreferenceController {
  constructor(private readonly preferenceService: PreferenceService) {}

  async getPreferences(
    request: FastifyRequest<{
      Params: { workspaceId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const userId = (request as any).user?.id;

      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      const preferences = await this.preferenceService.getOrCreatePreferences(
        userId,
        workspaceId,
      );

      return ResponseHelper.success(
        reply,
        200,
        "Preferences retrieved successfully",
        this.serializePreference(preferences),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateGlobalPreferences(
    request: FastifyRequest<{
      Params: { workspaceId: string };
      Body: GlobalPreferenceSettings;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const userId = (request as any).user?.id;
      const settings = request.body;

      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      const preferences = await this.preferenceService.updateGlobalPreferences(
        userId,
        workspaceId,
        settings,
      );

      return ResponseHelper.success(
        reply,
        200,
        "Preferences updated successfully",
        this.serializePreference(preferences),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateTypePreference(
    request: FastifyRequest<{
      Params: { workspaceId: string; type: string };
      Body: TypeSettingValue;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, type } = request.params;
      const userId = (request as any).user?.id;
      const settings = request.body;

      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      const preferences = await this.preferenceService.updateTypePreference(
        userId,
        workspaceId,
        type as NotificationType,
        settings,
      );

      return ResponseHelper.success(
        reply,
        200,
        "Type preference updated successfully",
        this.serializePreference(preferences),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async checkChannelEnabled(
    request: FastifyRequest<{
      Params: { workspaceId: string };
      Querystring: { type: string; channel: "email" | "inApp" | "push" };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const { type, channel } = request.query;
      const userId = (request as any).user?.id;

      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      const isEnabled = await this.preferenceService.isChannelEnabled(
        userId,
        workspaceId,
        type as NotificationType,
        channel,
      );

      return ResponseHelper.success(
        reply,
        200,
        "Channel status retrieved successfully",
        {
          type,
          channel,
          isEnabled,
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  private serializePreference(preference: NotificationPreference) {
    return {
      id: preference.getId().getValue(),
      userId: preference.getUserId().getValue(),
      workspaceId: preference.getWorkspaceId().getValue(),
      emailEnabled: preference.isEmailEnabled(),
      inAppEnabled: preference.isInAppEnabled(),
      pushEnabled: preference.isPushEnabled(),
    };
  }
}
