import { IExemptionRepository } from '../../domain/repositories/exemption.repository';
import { OperationService } from '@shared/services/operation.service';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';
import { WorkspaceId } from '@core/domain/value-objects';

import { UnauthorizedWorkspaceAccessError } from '@shared/errors/workspace-authorization.error';

export interface ExpireExemptionsCommand extends ICommand {
  readonly workspaceId: string;
  readonly actorId?: string;
  readonly servicePrincipal?: string;
  readonly authToken?: string;
}

export type ExpireExemptionsInput = ExpireExemptionsCommand;

export class ExpireExemptionsHandler implements ICommandHandler<ExpireExemptionsCommand, CommandResult<void>> {
  constructor(
    private readonly exemptionRepository: IExemptionRepository,
    private readonly operations: OperationService
  ) {}

  async handle(command: ExpireExemptionsCommand): Promise<CommandResult<void>> {
    if (!command.actorId && !command.servicePrincipal) {
      throw new UnauthorizedWorkspaceAccessError(
        'ExpireExemptions requires an authenticated actorId (ADMIN) or verified servicePrincipal'
      );
    }

    if (command.servicePrincipal) {
      await this.operations.authorize({
        servicePrincipal: command.servicePrincipal,
        workspaceId: command.workspaceId,
        authToken: command.authToken,
      });
    } else if (command.actorId) {
      await this.operations.authorize({
        actorId: command.actorId,
        workspaceId: command.workspaceId,
        role: 'ADMIN',
        authToken: command.authToken,
      });
    }

    const wsId = WorkspaceId.fromString(command.workspaceId);
    const now = new Date();
    const batchSize = 100;

    while (true) {
      const count = await this.exemptionRepository.expireExpiredBatch(wsId, now, batchSize);
      if (count < batchSize) break;
    }

    return CommandResult.success();
  }
}
