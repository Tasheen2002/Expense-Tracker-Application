import { PrismaClient } from '@prisma/client';
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

import { HttpExpenseReferenceAdapter } from './modules/receipt-vault/infrastructure/adapters/http-expense-reference.adapter';
import { DownloadReceiptHandler } from './modules/receipt-vault/application/queries/download-receipt.query';

export function createCompositionRoot(prisma: PrismaClient) {
    // Repositories
    const receiptRepository = new ReceiptRepositoryImpl(prisma);
    const receiptMetadataRepository = new ReceiptMetadataRepositoryImpl(prisma);
    const receiptTagDefinitionRepository = new ReceiptTagDefinitionRepositoryImpl(prisma);
    const receiptTagRepository = new ReceiptTagRepositoryImpl(prisma);
    const outboxEventRepository = new PrismaOutboxEventRepository(prisma);


    // Services / Adapters
    const fileStorageService = new LocalFileStorageAdapter(
      process.env.RECEIPT_UPLOAD_DIR ?? path.join(process.cwd(), 'uploads'),
      process.env.UPLOAD_BASE_URL || 'http://localhost:3000/uploads'
    );

    const receiptService = new ReceiptService(
      receiptRepository,
      receiptMetadataRepository,
      receiptTagRepository,
      fileStorageService,
      new HttpExpenseReferenceAdapter()
    );

    const receiptTagService = new ReceiptTagService(
      receiptTagDefinitionRepository
    );


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
      getReceiptStatsHandler,
      new DownloadReceiptHandler(receiptService)
    );

    const receiptTagController = new ReceiptTagController(
      createReceiptTagHandler,
      updateReceiptTagHandler,
      deleteReceiptTagHandler,
      listReceiptTagsHandler
    );

  return Object.freeze({ prisma, outboxEventRepository, fileStorageService, receiptService,
    receiptController, tagController: receiptTagController });
}
export type CompositionRoot = ReturnType<typeof createCompositionRoot>;
