import { getVisibleExpense } from '../services/expense-access';
import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { AttachmentService } from '../services/attachment.service';
import { AttachmentDTO } from '../../domain/entities/attachment.entity';
import { AttachmentNotFoundError } from '../../domain/errors/expense.errors';
import { ExpenseService } from '../services/expense.service';
import { OperationService } from '../services/operation.service';

import { WorkspaceMembershipContext } from '../ports/workspace-authorization.port';

export interface GetAttachmentQuery extends IQuery {
  readonly attachmentId: string;
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly role?: string;
  readonly authToken?: string;
  readonly verifiedMembership?: WorkspaceMembershipContext;
}

export class GetAttachmentHandler implements IQueryHandler<
  GetAttachmentQuery,
  AttachmentDTO
> {
  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly expenseService: ExpenseService,
    private readonly operationService: OperationService
  ) {
    if (!attachmentService) {
      throw new Error('AttachmentService is required for GetAttachmentHandler');
    }
    if (!expenseService) {
      throw new Error('ExpenseService is required for GetAttachmentHandler');
    }
    if (!operationService) {
      throw new Error('OperationService is required for GetAttachmentHandler');
    }
  }

  async handle(query: GetAttachmentQuery): Promise<AttachmentDTO> {
    await getVisibleExpense(this.operationService, this.expenseService, {
      actorId: query.userId,
      workspaceId: query.workspaceId,
      expenseId: query.expenseId,
      authToken: query.authToken,
      verifiedMembership: query.verifiedMembership,
      action: 'view attachment',
    });

    const attachment = await this.attachmentService.getAttachmentDTOById(
      query.attachmentId,
      query.workspaceId
    );

    if (!attachment || attachment.expenseId !== query.expenseId) {
      throw new AttachmentNotFoundError(query.attachmentId);
    }

    return attachment;
  }
}
