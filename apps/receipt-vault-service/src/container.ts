import { PrismaClient } from '@prisma/client';
import { InMemoryEventBus } from '@core/domain/events/in-memory-event-bus';
import { DomainEvent, DomainEventHandler } from '@core/domain/events/domain-event';
import path from 'path';

// Repositories
import { ReceiptRepositoryImpl } from './modules/receipt-vault/infrastructure/persistence/receipt.repository.impl';
import { ReceiptMetadataRepositoryImpl } from './modules/receipt-vault/infrastructure/persistence/receipt-metadata.repository.impl';
import { ReceiptTagDefinitionRepositoryImpl } from './modules/receipt-vault/infrastructure/persistence/receipt-tag-definition.repository.impl';
import { ReceiptTagRepositoryImpl } from './modules/receipt-vault/infrastructure/persistence/receipt-tag.repository.impl';
import { PrismaOutboxEventRepository } from './modules/receipt-vault/infrastructure/persistence/outbox-event.repository.impl';

// Adapters & Services
import { LocalFileStorageAdapter } from './modules/receipt-vault/infrastructure/adapters/local-file-storage.adapter';
import { ReceiptService } from './modules/receipt-vault/application/services/receipt.service';
import { TagService as ReceiptTagService } from './modules/receipt-vault/application/services/tag.service';

// Command Handlers
import { UploadReceiptHandler } from './modules/receipt-vault/application/commands/upload-receipt.command';
import { LinkReceiptToExpenseHandler } from './modules/receipt-vault/application/commands/link-receipt-to-expense.command';
import { UnlinkReceiptFromExpenseHandler } from './modules/receipt-vault/application/commands/unlink-receipt-from-expense.command';
import { ProcessReceiptHandler } from './modules/receipt-vault/application/commands/process-receipt.command';
import { VerifyReceiptHandler } from './modules/receipt-vault/application/commands/verify-receipt.command';
import { RejectReceiptHandler } from './modules/receipt-vault/application/commands/reject-receipt.command';
import { DeleteReceiptHandler } from './modules/receipt-vault/application/commands/delete-receipt.command';
import { AddReceiptMetadataHandler } from './modules/receipt-vault/application/commands/add-receipt-metadata.command';
import { UpdateReceiptMetadataHandler } from './modules/receipt-vault/application/commands/update-receipt-metadata.command';
import { AddReceiptTagHandler } from './modules/receipt-vault/application/commands/add-receipt-tag.command';
import { RemoveReceiptTagHandler } from './modules/receipt-vault/application/commands/remove-receipt-tag.command';
import { CreateTagHandler as CreateReceiptTagHandler } from './modules/receipt-vault/application/commands/create-tag.command';
import { UpdateTagHandler as UpdateReceiptTagHandler } from './modules/receipt-vault/application/commands/update-tag.command';
import { DeleteTagHandler as DeleteReceiptTagHandler } from './modules/receipt-vault/application/commands/delete-tag.command';

// Query Handlers
import { GetReceiptHandler } from './modules/receipt-vault/application/queries/get-receipt.query';
import { ListReceiptsHandler } from './modules/receipt-vault/application/queries/list-receipts.query';
import { GetReceiptsByExpenseHandler } from './modules/receipt-vault/application/queries/get-receipts-by-expense.query';
import { GetReceiptMetadataHandler } from './modules/receipt-vault/application/queries/get-receipt-metadata.query';
import { GetReceiptStatsHandler } from './modules/receipt-vault/application/queries/get-receipt-stats.query';
import { ListTagsHandler as ListReceiptTagsHandler } from './modules/receipt-vault/application/queries/list-tags.query';

// Controllers
import { ReceiptController } from './modules/receipt-vault/infrastructure/http/controllers/receipt.controller';
import { TagController as ReceiptTagController } from './modules/receipt-vault/infrastructure/http/controllers/tag.controller';

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
    const eventBus = new InMemoryEventBus();

    this.services.set('prisma', prisma);
    this.services.set('eventBus', eventBus);

    // Register outbox event listeners to intercept domain events and write them to outbox
    eventBus.subscribe('ReceiptUploaded', new OutboxEventHandler('ReceiptUploaded', prisma));
    eventBus.subscribe('ReceiptProcessed', new OutboxEventHandler('ReceiptProcessed', prisma));
    eventBus.subscribe('ReceiptLinkedToExpense', new OutboxEventHandler('ReceiptLinkedToExpense', prisma));
    eventBus.subscribe('ReceiptDeleted', new OutboxEventHandler('ReceiptDeleted', prisma));

    // Repositories
    const receiptRepository = new ReceiptRepositoryImpl(prisma, eventBus);
    const receiptMetadataRepository = new ReceiptMetadataRepositoryImpl(prisma, eventBus);
    const receiptTagDefinitionRepository = new ReceiptTagDefinitionRepositoryImpl(prisma, eventBus);
    const receiptTagRepository = new ReceiptTagRepositoryImpl(prisma);
    const outboxEventRepository = new PrismaOutboxEventRepository(prisma);

    this.services.set('receiptRepository', receiptRepository);
    this.services.set('receiptMetadataRepository', receiptMetadataRepository);
    this.services.set('receiptTagDefinitionRepository', receiptTagDefinitionRepository);
    this.services.set('receiptTagRepository', receiptTagRepository);
    this.services.set('outboxEventRepository', outboxEventRepository);

    // Services / Adapters
    const fileStorageService = new LocalFileStorageAdapter(
      path.join(process.cwd(), 'uploads'),
      process.env.UPLOAD_BASE_URL || 'http://localhost:3000/uploads'
    );

    const receiptService = new ReceiptService(
      receiptRepository,
      receiptMetadataRepository,
      receiptTagRepository,
      fileStorageService
    );

    const receiptTagService = new ReceiptTagService(
      receiptTagDefinitionRepository,
      receiptTagRepository
    );

    this.services.set('fileStorageService', fileStorageService);
    this.services.set('receiptService', receiptService);
    this.services.set('receiptTagService', receiptTagService);

    // Command Handlers
    const uploadReceiptHandler = new UploadReceiptHandler(receiptService);
    const linkReceiptToExpenseHandler = new LinkReceiptToExpenseHandler(receiptService);
    const unlinkReceiptFromExpenseHandler = new UnlinkReceiptFromExpenseHandler(receiptService);
    const processReceiptHandler = new ProcessReceiptHandler(receiptService);
    const verifyReceiptHandler = new VerifyReceiptHandler(receiptService);
    const rejectReceiptHandler = new RejectReceiptHandler(receiptService);
    const deleteReceiptHandler = new DeleteReceiptHandler(receiptService);
    const addReceiptMetadataHandler = new AddReceiptMetadataHandler(receiptService);
    const updateReceiptMetadataHandler = new UpdateReceiptMetadataHandler(receiptService);
    const addReceiptTagHandler = new AddReceiptTagHandler(receiptService);
    const removeReceiptTagHandler = new RemoveReceiptTagHandler(receiptService);
    const createReceiptTagHandler = new CreateReceiptTagHandler(receiptTagService);
    const updateReceiptTagHandler = new UpdateReceiptTagHandler(receiptTagService);
    const deleteReceiptTagHandler = new DeleteReceiptTagHandler(receiptTagService);

    // Query Handlers
    const getReceiptHandler = new GetReceiptHandler(receiptService);
    const listReceiptsHandler = new ListReceiptsHandler(receiptService);
    const getReceiptsByExpenseHandler = new GetReceiptsByExpenseHandler(receiptService);
    const getReceiptMetadataHandler = new GetReceiptMetadataHandler(receiptService);
    const getReceiptStatsHandler = new GetReceiptStatsHandler(receiptService);
    const listReceiptTagsHandler = new ListReceiptTagsHandler(receiptTagService);

    // Controllers
    const receiptController = new ReceiptController(
      uploadReceiptHandler,
      linkReceiptToExpenseHandler,
      unlinkReceiptFromExpenseHandler,
      processReceiptHandler,
      verifyReceiptHandler,
      rejectReceiptHandler,
      deleteReceiptHandler,
      addReceiptMetadataHandler,
      updateReceiptMetadataHandler,
      addReceiptTagHandler,
      removeReceiptTagHandler,
      getReceiptHandler,
      listReceiptsHandler,
      getReceiptsByExpenseHandler,
      getReceiptMetadataHandler,
      getReceiptStatsHandler
    );

    const receiptTagController = new ReceiptTagController(
      createReceiptTagHandler,
      updateReceiptTagHandler,
      deleteReceiptTagHandler,
      listReceiptTagsHandler
    );

    this.services.set('receiptController', receiptController);
    this.services.set('receiptTagController', receiptTagController);
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in container`);
    }
    return service as T;
  }
}

export const container = Container.getInstance();
