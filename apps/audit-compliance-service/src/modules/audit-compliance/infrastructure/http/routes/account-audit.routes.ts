import { FastifyInstance } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { AccountAuditController } from '../controllers/account-audit.controller';
import {
  accountAuditQuerySchema,
  AccountAuditQuery,
  accountAuditListResponseSchema,
} from '../validation/account-audit.schema';
import { validateQuery, toJsonSchema } from '../validation/validator';
export async function accountAuditRoutes(
  app: FastifyInstance,
  controller: AccountAuditController
): Promise<void> {
  app.get(
    '/account/audit-logs',
    {
      onRequest: [app.authenticate],
      preValidation: [validateQuery(accountAuditQuerySchema)],
      schema: {
        querystring: toJsonSchema(accountAuditQuerySchema),
        tags: ['Account Audit'],
        summary: 'List own account audit history',
        description:
          'Return account events belonging to the authenticated actor.',
        security: [{ bearerAuth: [] }],
        response: { 200: toJsonSchema(accountAuditListResponseSchema) },
      },
    },
    (request, reply) =>
      controller.list(
        request as AuthenticatedRequest<{ Querystring: AccountAuditQuery }>,
        reply
      )
  );
}
