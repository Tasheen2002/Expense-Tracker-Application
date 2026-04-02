import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { IBankConnectionRepository } from '../../domain/repositories/bank-connection.repository';
import { BankConnectionNotFoundError } from '../../domain/errors/bank-feed-sync.errors';
import { CommandResult } from '../../../../packages/core/src/application/command-result';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface UpdateConnectionTokenCommand extends ICommand {
  workspaceId: string;
  connectionId: string;
  accessToken: string;
  tokenExpiresAt?: Date;
}

export class UpdateConnectionTokenHandler implements ICommandHandler<
  UpdateConnectionTokenCommand,
  CommandResult<void>
> {
  constructor(
    private readonly connectionRepository: IBankConnectionRepository
  ) {}

  async handle(
    command: UpdateConnectionTokenCommand
  ): Promise<CommandResult<void>> {
    const workspaceId = WorkspaceId.fromString(command.workspaceId);
    const connectionId = BankConnectionId.fromString(command.connectionId);

    const connection = await this.connectionRepository.findById(
      connectionId,
      workspaceId
    );

    if (!connection) {
      throw new BankConnectionNotFoundError(command.connectionId);
    }

    connection.updateAccessToken(command.accessToken, command.tokenExpiresAt);
    await this.connectionRepository.save(connection);

    return CommandResult.success();
  }
}
