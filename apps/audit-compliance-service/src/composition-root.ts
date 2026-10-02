import type { PrismaClient } from '@prisma/client';
import { AuditLogRepositoryImpl } from './modules/audit-compliance/infrastructure/persistence/audit-log.repository.impl';
import { AuditService } from './modules/audit-compliance/application/services/audit.service';
import { CreateAuditLogHandler } from './modules/audit-compliance/application/commands/create-audit-log.command';
import { PurgeAuditLogsHandler } from './modules/audit-compliance/application/commands/purge-audit-logs.command';
import { GetAuditLogHandler } from './modules/audit-compliance/application/queries/get-audit-log.query';
import { ListAuditLogsHandler } from './modules/audit-compliance/application/queries/list-audit-logs.query';
import { GetEntityAuditHistoryHandler } from './modules/audit-compliance/application/queries/get-entity-audit-history.query';
import { GetAuditSummaryHandler } from './modules/audit-compliance/application/queries/get-audit-summary.query';
import { AuditLogController } from './modules/audit-compliance/infrastructure/http/controllers/audit-log.controller';

export interface AuditCompositionRoot {
  readonly auditService: AuditService;
  readonly auditLogController: AuditLogController;
}

export function createCompositionRoot(prisma: PrismaClient): AuditCompositionRoot {
  if (!prisma) throw new Error('Audit composition root requires a Prisma client');

  const repository = new AuditLogRepositoryImpl(prisma);
  const auditService = new AuditService(repository);
  const auditLogController = new AuditLogController(
    new CreateAuditLogHandler(auditService),
    new PurgeAuditLogsHandler(auditService),
    new GetAuditLogHandler(auditService),
    new ListAuditLogsHandler(auditService),
    new GetEntityAuditHistoryHandler(auditService),
    new GetAuditSummaryHandler(auditService),
  );

  return Object.freeze({ auditService, auditLogController });
}
