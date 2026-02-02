import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationService } from "../application/services/notification.service";
import { NotificationType } from "../domain/enums/notification-type.enum";
import { NotificationChannel } from "../domain/enums/notification-channel.enum";
import { NotificationStatus } from "../domain/enums/notification-status.enum";
import { NotificationPreference } from "../domain/entities/notification-preference.entity";
import { UserId } from "../../identity-workspace/domain/value-objects/user-id.vo";
import { WorkspaceId } from "../../identity-workspace/domain/value-objects/workspace-id.vo";

// Mock dependencies
const mockNotificationRepository = {
  save: vi.fn(),
  findById: vi.fn(),
  markAllAsRead: vi.fn(),
  findUnreadByRecipient: vi.fn(),
  findByRecipient: vi.fn(),
  countUnread: vi.fn(),
};

const mockTemplateRepository = {
  findActiveTemplate: vi.fn(),
};

const mockPreferenceRepository = {
  findByUserAndWorkspace: vi.fn(),
  save: vi.fn(),
};

const mockUserRepository = {
  findById: vi.fn(),
};

const mockEmailProvider = {
  send: vi.fn(),
};

describe("Notification Service", () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationService(
      mockNotificationRepository as any,
      mockTemplateRepository as any,
      mockPreferenceRepository as any,
      mockUserRepository as any,
      mockEmailProvider as any,
    );
  });

  describe("send", () => {
    const params = {
      workspaceId: "123e4567-e89b-12d3-a456-426614174000",
      recipientId: "123e4567-e89b-12d3-a456-426614174001",
      type: NotificationType.SYSTEM_ALERT,
      data: { message: "Test alert" },
    };

    it("should handle email provider failure by marking notification as failed", async () => {
      // Mock Preferences (Enabled for Email)
      const mockPref = {
        isChannelEnabledForType: vi.fn().mockReturnValue(true),
      };
      mockPreferenceRepository.findByUserAndWorkspace.mockResolvedValue(
        mockPref,
      );

      // Mock Template (Found)
      const mockTemplate = {
        getSubjectTemplate: () => "Alert: {{message}}",
        getBodyTemplate: () => "Body: {{message}}",
      };
      mockTemplateRepository.findActiveTemplate.mockResolvedValue(mockTemplate);

      // Mock User (Found)
      mockUserRepository.findById.mockResolvedValue({
        getEmail: () => ({ getValue: () => "test@test.com" }),
      });

      // Mock Email Provider FAILURE
      mockEmailProvider.send.mockResolvedValue({
        success: false,
        error: "SMTP Error",
      });

      const notifications = await service.send(params);

      expect(notifications).toHaveLength(2); // Email + InApp (default enabled in loop) logic in service checks specific channels

      // Check EMAIL notification
      const emailNotification = notifications.find(
        (n) => n.getChannel() === NotificationChannel.EMAIL,
      );
      expect(emailNotification).toBeDefined();
      expect(emailNotification!.getStatus()).toBe(NotificationStatus.FAILED);
      expect(emailNotification!.getError()).toContain(
        "Failed to send notification via EMAIL: SMTP Error",
      );
    });
  });
});
