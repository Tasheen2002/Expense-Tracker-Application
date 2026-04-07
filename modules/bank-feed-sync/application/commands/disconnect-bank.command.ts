import { WorkspaceId } from '../../../identity-workspace';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { IBankConnectionRepository } from '../../domain/repositories/bank-connection.repository';
import { BankConnectionNotFoundError } from '../../domain/errors/bank-feed-sync.errors';
import { CommandResult } from '../../../../packages/core/src/application/command-result';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface DisconnectBankCommand extends ICommand {
  workspaceId: string;
  connectionId: string;
}

export class DisconnectBankHandler implements ICommandHandler<
  DisconnectBankCommand,
  CommandResult<void>
> {
  constructor(
    private readonly connectionRepository: IBankConnectionRepository
  ) {}

  async handle(command: DisconnectBankCommand): Promise<CommandResult<void>> {
    try {
      const workspaceId = WorkspaceId.fromString(command.workspaceId);
      const connectionId = BankConnectionId.fromString(command.connectionId);

      const connection = await this.connectionRepository.findById(
        connectionId,
        workspaceId
      );

      if (!connection) {
        throw new BankConnectionNotFoundError(command.connectionId);
      }

      connection.disconnect();
      await this.connectionRepository.save(connection);

      return CommandResult.success();
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
