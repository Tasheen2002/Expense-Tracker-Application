import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { ListAccountAuditLogsHandler } from '../../../application/queries/list-account-audit-logs.query';
import { AccountAuditQuery } from '../validation/account-audit.schema';
import { ResponseHelper } from '@shared/response.helper';

export class AccountAuditController {
  constructor(
    private readonly listAccountAuditLogsHandler: Pick<
      ListAccountAuditLogsHandler,
      'handle'
    >
  ) {}

  async list(
    request: AuthenticatedRequest<{ Querystring: AccountAuditQuery }>,
    reply: FastifyReply
  ) {
    try {
      const result = await this.listAccountAuditLogsHandler.handle({
        actorId: request.user.userId,
        limit: request.query.limit,
        offset: request.query.offset,
      });
      return ResponseHelper.ok(
        reply,
        'Account audit history retrieved',
        result
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
