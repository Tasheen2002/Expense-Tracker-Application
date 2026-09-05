import { PrismaClient } from '@prisma/client';
import { getEventBus, InMemoryEventBus } from '@expense-tracker/core';

// Repositories
import { AuditLogRepositoryImpl } from './modules/audit-compliance/infrastructure/persistence/audit-log.repository.impl';

// Services
import { AuditService } from './modules/audit-compliance/application/services/audit.service';

// Command Handlers
import { CreateAuditLogHandler } from './modules/audit-compliance/application/commands/create-audit-log.command';
import { PurgeAuditLogsHandler } from './modules/audit-compliance/application/commands/purge-audit-logs.command';

// Query Handlers
import { GetAuditLogHandler } from './modules/audit-compliance/application/queries/get-audit-log.query';
import { ListAuditLogsHandler } from './modules/audit-compliance/application/queries/list-audit-logs.query';
import { GetEntityAuditHistoryHandler } from './modules/audit-compliance/application/queries/get-entity-audit-history.query';
import { GetAuditSummaryHandler } from './modules/audit-compliance/application/queries/get-audit-summary.query';

// Controllers
import { AuditLogController } from './modules/audit-compliance/infrastructure/http/controllers/audit-log.controller';

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

    // Repositories
    const auditLogRepository = new AuditLogRepositoryImpl(prisma, eventBus);

    this.services.set('auditLogRepository', auditLogRepository);
    this.services.set('prisma', prisma);

    // Services
    const auditService = new AuditService(auditLogRepository);
    this.services.set('auditService', auditService);

    // Command Handlers
    const createAuditLogHandler = new CreateAuditLogHandler(auditService);
    const purgeAuditLogsHandler = new PurgeAuditLogsHandler(auditService);

    // Query Handlers
    const getAuditLogHandler = new GetAuditLogHandler(auditService);
    const listAuditLogsHandler = new ListAuditLogsHandler(auditService);
    const getEntityAuditHistoryHandler = new GetEntityAuditHistoryHandler(auditService);
    const getAuditSummaryHandler = new GetAuditSummaryHandler(auditService);

    // Controllers
    const auditLogController = new AuditLogController(
      createAuditLogHandler,
      purgeAuditLogsHandler,
      getAuditLogHandler,
      listAuditLogsHandler,
      getEntityAuditHistoryHandler,
      getAuditSummaryHandler
    );

    this.services.set('createAuditLogHandler', createAuditLogHandler);
    this.services.set('purgeAuditLogsHandler', purgeAuditLogsHandler);
    this.services.set('getAuditLogHandler', getAuditLogHandler);
    this.services.set('listAuditLogsHandler', listAuditLogsHandler);
    this.services.set('getEntityAuditHistoryHandler', getEntityAuditHistoryHandler);
    this.services.set('getAuditSummaryHandler', getAuditSummaryHandler);
    this.services.set('auditLogController', auditLogController);
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in container`);
    }
    return service as T;
  }

  getAuditServices() {
    return {
      auditLogController: this.get<AuditLogController>('auditLogController'),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }
}

export const container = Container.getInstance();
