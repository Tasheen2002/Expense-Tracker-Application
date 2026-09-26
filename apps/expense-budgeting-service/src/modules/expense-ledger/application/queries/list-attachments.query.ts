import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { AttachmentService } from '../services/attachment.service';
import { AttachmentDTO } from '../../domain/entities/attachment.entity';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import { ExpenseService } from '../services/expense.service';
import { OperationService } from '../services/operation.service';
import {
  ExpenseNotFoundError,
  UnauthorizedExpenseAccessError,
} from '../../domain/errors/expense.errors';

import { WorkspaceMembershipContext } from '../ports/workspace-authorization.port';

export interface ListAttachmentsQuery extends IQuery {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly role?: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly authToken?: string;
  readonly verifiedMembership?: WorkspaceMembershipContext;
}

export class ListAttachmentsHandler implements IQueryHandler<ListAttachmentsQuery, PaginatedResult<AttachmentDTO>> {
  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly expenseService: ExpenseService,
    private readonly operationService: OperationService
  ) {
    if (!attachmentService) {
      throw new Error('AttachmentService is required for ListAttachmentsHandler');
    }
    if (!expenseService) {
      throw new Error('ExpenseService is required for ListAttachmentsHandler');
    }
    if (!operationService) {
      throw new Error('OperationService is required for ListAttachmentsHandler');
    }
  }

  async handle(query: ListAttachmentsQuery): Promise<PaginatedResult<AttachmentDTO>> {
    if (!query.userId) {
      throw new UnauthorizedExpenseAccessError(query.expenseId, 'anonymous', 'list attachments');
    }

    // Verify workspace membership at application boundary
    const membership = await this.operationService.authorize({
      actorId: query.userId,
      workspaceId: query.workspaceId,
      authToken: query.authToken,
      verifiedMembership: query.verifiedMembership,
    });

    const expense = await this.expenseService.getExpenseById(
      query.expenseId,
      query.workspaceId
    );

    if (!expense) {
      throw new ExpenseNotFoundError(query.expenseId, query.workspaceId);
    }

    // Application-boundary authorization: enforce expense visibility
    const effectiveRole = membership.role;
    this.operationService.authorizeExpenseVisibility(query.userId, expense, effectiveRole);

    return this.attachmentService.getAttachmentDTOsByExpense(
      query.expenseId,
      query.workspaceId,
      { limit: query.limit, offset: query.offset }
    );
  }
}
