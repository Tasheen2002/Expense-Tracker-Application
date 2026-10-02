import { PrismaClient } from './prisma-client';
import { InMemoryEventBus } from '@expense-tracker/core';

// Outbox repo
import { PrismaOutboxEventRepository } from './repositories/outbox-event.repository';

// Repositories
import { NotificationRepositoryImpl } from './modules/notification-dispatch/infrastructure/persistence/notification.repository.impl';
import { NotificationTemplateRepositoryImpl } from './modules/notification-dispatch/infrastructure/persistence/notification-template.repository.impl';
import { NotificationPreferenceRepositoryImpl } from './modules/notification-dispatch/infrastructure/persistence/notification-preference.repository.impl';

// Recipient lookup adapter
import { PrismaRecipientLookupAdapter } from './modules/notification-dispatch/infrastructure/adapters/recipient-lookup.adapter';
import { ResendEmailProvider } from './modules/notification-dispatch/infrastructure/adapters/resend-email.provider';
import { MailpitEmailProvider } from './modules/notification-dispatch/infrastructure/adapters/mailpit-email.provider';
import { EmailDeliveryRepositoryImpl } from './modules/notification-dispatch/infrastructure/persistence/email-delivery.repository.impl';
import { EmailDeliveryService } from './modules/notification-dispatch/application/services/email-delivery.service';
import { EmailDeliveryWorker } from './workers/email-delivery.worker';
import { SendNotificationHandler } from './modules/notification-dispatch/application/commands/send-notification.command';

// Services
import { NotificationService } from './modules/notification-dispatch/application/services/notification.service';
import { TemplateService } from './modules/notification-dispatch/application/services/template.service';
import { PreferenceService } from './modules/notification-dispatch/application/services/preference.service';

// Command Handlers
import { MarkAsReadHandler } from './modules/notification-dispatch/application/commands/mark-as-read.command';
import { MarkAllAsReadHandler } from './modules/notification-dispatch/application/commands/mark-all-as-read.command';
import { CreateTemplateHandler } from './modules/notification-dispatch/application/commands/create-template.command';
import { UpdateTemplateHandler } from './modules/notification-dispatch/application/commands/update-template.command';
import { ActivateTemplateHandler } from './modules/notification-dispatch/application/commands/activate-template.command';
import { DeactivateTemplateHandler } from './modules/notification-dispatch/application/commands/deactivate-template.command';
import { UpdatePreferencesHandler } from './modules/notification-dispatch/application/commands/update-preferences.command';
import { UpdateTypePreferenceHandler } from './modules/notification-dispatch/application/commands/update-type-preference.command';

// Query Handlers
import { ListNotificationsHandler } from './modules/notification-dispatch/application/queries/list-notifications.query';
import { GetUnreadCountHandler } from './modules/notification-dispatch/application/queries/get-unread-count.query';
import { GetUnreadNotificationsHandler } from './modules/notification-dispatch/application/queries/get-unread-notifications.query';
import { GetTemplateByIdHandler } from './modules/notification-dispatch/application/queries/get-template-by-id.query';
import { GetActiveTemplateHandler } from './modules/notification-dispatch/application/queries/get-active-template.query';
import { GetPreferencesHandler } from './modules/notification-dispatch/application/queries/get-preferences.query';
import { CheckChannelEnabledHandler } from './modules/notification-dispatch/application/queries/check-channel-enabled.query';

// Controllers
import { NotificationController } from './modules/notification-dispatch/infrastructure/http/controllers/notification.controller';
import { TemplateController } from './modules/notification-dispatch/infrastructure/http/controllers/template.controller';
import { PreferenceController } from './modules/notification-dispatch/infrastructure/http/controllers/preference.controller';

import { OutboxWorker, HttpWebhookPublisher } from '@expense-tracker/outbox-kit';
export interface ManagedWorker {
  start(): void;
  stop(): Promise<void>;
}
export interface CompositionOptions {
  onWorkerError?: (error: unknown) => void;
}
export function createCompositionRoot(prisma: PrismaClient, options: CompositionOptions = {}) {
    // Repositories record domain events transactionally; bus subscribers are
    // only for best-effort in-process delivery after commit.
    const eventBus = new InMemoryEventBus();

    // Repositories
    const notificationRepository = new NotificationRepositoryImpl(prisma, eventBus);
    const notificationTemplateRepository = new NotificationTemplateRepositoryImpl(prisma);
    const notificationPreferenceRepository = new NotificationPreferenceRepositoryImpl(prisma);
    const outboxEventRepository = new PrismaOutboxEventRepository(prisma);


    // Recipient lookup
    const recipientLookup = new PrismaRecipientLookupAdapter();

    // Services
    const notificationService = new NotificationService(
      notificationRepository,
      notificationTemplateRepository,
      notificationPreferenceRepository
    );
    const templateService = new TemplateService(notificationTemplateRepository);
    const preferenceService = new PreferenceService(notificationPreferenceRepository);

    const apiKey = (process.env.RESEND_API_KEY ?? '').trim();
    const sender = (process.env.NOTIFICATION_EMAIL_FROM ?? '').trim();
    const provider = (process.env.NOTIFICATION_EMAIL_PROVIDER ?? 'resend').trim();
    if (!['resend', 'mailpit'].includes(provider)) throw new Error('NOTIFICATION_EMAIL_PROVIDER must be resend or mailpit');
    if (provider === 'resend' && Boolean(apiKey) !== Boolean(sender)) throw new Error('Configure both RESEND_API_KEY and NOTIFICATION_EMAIL_FROM');
    let email: ManagedWorker | undefined;
    if (provider === 'mailpit' || (apiKey && sender)) {
      const transport = provider === 'mailpit'
        ? new MailpitEmailProvider(process.env.MAILPIT_URL ?? 'http://localhost:8025', sender || 'notifications@expense-tracker.test')
        : new ResendEmailProvider(apiKey, sender);
      const delivery = new EmailDeliveryService(new EmailDeliveryRepositoryImpl(prisma, eventBus),
        transport, recipientLookup);
      email = new EmailDeliveryWorker(delivery, options.onWorkerError);
    }

    // Command Handlers
    // Send is an internal required-ID command; there is no unrestricted HTTP endpoint.
    const markAsReadHandler = new MarkAsReadHandler(notificationService);
    const markAllAsReadHandler = new MarkAllAsReadHandler(notificationService);
    const createTemplateHandler = new CreateTemplateHandler(templateService);
    const updateTemplateHandler = new UpdateTemplateHandler(templateService);
    const activateTemplateHandler = new ActivateTemplateHandler(templateService);
    const deactivateTemplateHandler = new DeactivateTemplateHandler(templateService);
    const updatePreferencesHandler = new UpdatePreferencesHandler(preferenceService);
    const updateTypePreferenceHandler = new UpdateTypePreferenceHandler(preferenceService);

    // Query Handlers
    const listNotificationsHandler = new ListNotificationsHandler(notificationService);
    const getUnreadCountHandler = new GetUnreadCountHandler(notificationService);
    const getUnreadNotificationsHandler = new GetUnreadNotificationsHandler(notificationService);
    const getTemplateByIdHandler = new GetTemplateByIdHandler(templateService);
    const getActiveTemplateHandler = new GetActiveTemplateHandler(templateService);
    const getPreferencesHandler = new GetPreferencesHandler(preferenceService);
    const checkChannelEnabledHandler = new CheckChannelEnabledHandler(preferenceService);

    // Controllers
    const notificationController = new NotificationController(
      listNotificationsHandler,
      getUnreadCountHandler,
      getUnreadNotificationsHandler,
      markAsReadHandler,
      markAllAsReadHandler
    );

    const templateController = new TemplateController(
      createTemplateHandler,
      getTemplateByIdHandler,
      getActiveTemplateHandler,
      updateTemplateHandler,
      activateTemplateHandler,
      deactivateTemplateHandler
    );

    const preferenceController = new PreferenceController(
      getPreferencesHandler,
      updatePreferencesHandler,
      updateTypePreferenceHandler,
      checkChannelEnabledHandler
    );

    const auditUrl = process.env.AUDIT_SERVICE_URL || 'http://localhost:3009';
    const endpoint = auditUrl.replace(/\/$/, '') + '/api/v1/event-outbox/events';
    const routes = Object.fromEntries([
      'NotificationCreated', 'notification.created', 'NotificationSent', 'notification.sent',
      'NotificationFailed', 'notification.failed', 'NotificationRead', 'notification.read',
    ].map(type => [type, [endpoint]]));
    const workers: Readonly<{ outbox: ManagedWorker; email?: ManagedWorker }> = Object.freeze({
      outbox: new OutboxWorker(outboxEventRepository, new HttpWebhookPublisher(routes), { pollIntervalMs: 5000 }),
      email,
    });
    return Object.freeze({
      prisma, workers,
      notificationRepository, notificationTemplateRepository, notificationPreferenceRepository, outboxEventRepository,
      notificationService, templateService, preferenceService,
      sendNotificationHandler: new SendNotificationHandler(notificationService),
      controllers: Object.freeze({ notificationController, templateController, preferenceController }),
    });
}
export type CompositionRoot = ReturnType<typeof createCompositionRoot>;
