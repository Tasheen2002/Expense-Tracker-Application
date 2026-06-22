import { PrismaClient } from '@prisma/client';
import { getEventBus, InMemoryEventBus, DomainEvent, DomainEventHandler } from '@expense-tracker/core';

// Outbox repo
import { PrismaOutboxEventRepository } from './repositories/outbox-event.repository';

// Repositories
import { NotificationRepositoryImpl } from './modules/notification-dispatch/infrastructure/persistence/notification.repository.impl';
import { NotificationTemplateRepositoryImpl } from './modules/notification-dispatch/infrastructure/persistence/notification-template.repository.impl';
import { NotificationPreferenceRepositoryImpl } from './modules/notification-dispatch/infrastructure/persistence/notification-preference.repository.impl';

// Recipient lookup adapter
import { PrismaRecipientLookupAdapter } from './modules/notification-dispatch/infrastructure/adapters/recipient-lookup.adapter';

// Services
import { NotificationService } from './modules/notification-dispatch/application/services/notification.service';
import { TemplateService } from './modules/notification-dispatch/application/services/template.service';
import { PreferenceService } from './modules/notification-dispatch/application/services/preference.service';

// Command Handlers
// SendNotificationHandler intentionally omitted — used internally by NotificationService
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

class OutboxEventHandler implements DomainEventHandler {
  constructor(
    public readonly eventType: string,
    private readonly prisma: PrismaClient
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    try {
      await this.prisma.outboxEvent.create({
        data: {
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          payload: event.getPayload() as any,
          status: 'PENDING',
        },
      });
    } catch (err) {
      console.error(`[OutboxEventHandler] Failed to persist event ${event.eventType} to outbox:`, err);
    }
  }
}

export class Container {
  private static instance: Container;
  private services: Map<string, unknown> = new Map();

  private constructor() {}

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  register(prisma: PrismaClient): void {
    const eventBus = getEventBus() as InMemoryEventBus;

    // Register outbox event listeners to intercept domain events and write them to outbox
    const eventsToOutbox = [
      'NotificationCreated',
      'NotificationSent',
      'NotificationFailed',
      'NotificationRead',
    ];

    for (const eventName of eventsToOutbox) {
      eventBus.subscribe(eventName, new OutboxEventHandler(eventName, prisma));
    }

    // Repositories
    const notificationRepository = new NotificationRepositoryImpl(prisma, eventBus);
    const notificationTemplateRepository = new NotificationTemplateRepositoryImpl(prisma);
    const notificationPreferenceRepository = new NotificationPreferenceRepositoryImpl(prisma);
    const outboxEventRepository = new PrismaOutboxEventRepository(prisma);

    this.services.set('notificationRepository', notificationRepository);
    this.services.set('notificationTemplateRepository', notificationTemplateRepository);
    this.services.set('notificationPreferenceRepository', notificationPreferenceRepository);
    this.services.set('outboxEventRepository', outboxEventRepository);
    this.services.set('prisma', prisma);

    // Recipient lookup
    const recipientLookup = new PrismaRecipientLookupAdapter();
    this.services.set('recipientLookup', recipientLookup);

    // Services
    const notificationService = new NotificationService(
      notificationRepository,
      notificationTemplateRepository,
      notificationPreferenceRepository,
      recipientLookup
    );
    const templateService = new TemplateService(notificationTemplateRepository);
    const preferenceService = new PreferenceService(notificationPreferenceRepository);

    this.services.set('notificationService', notificationService);
    this.services.set('templateService', templateService);
    this.services.set('preferenceService', preferenceService);

    // Command Handlers
    // sendNotificationHandler is used internally by NotificationService — not wired to a controller directly
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
    // getOrCreatePreferencesHandler is used internally — not wired to a route controller
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

    this.services.set('notificationController', notificationController);
    this.services.set('templateController', templateController);
    this.services.set('preferenceController', preferenceController);
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in container`);
    }
    return service as T;
  }

  getNotificationServices() {
    return {
      notificationController: this.get<NotificationController>('notificationController'),
      templateController: this.get<TemplateController>('templateController'),
      preferenceController: this.get<PreferenceController>('preferenceController'),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }
}

export const container = Container.getInstance();
