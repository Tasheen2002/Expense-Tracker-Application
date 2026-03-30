import { WorkspaceId } from '../../../identity-workspace';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { IBankConnectionRepository } from '../../domain/repositories/bank-connection.repository';
import { BankConnectionNotFoundError } from '../../domain/errors';
import { CommandResult } from '../../../../apps/api/src/shared/application/command-result';

export interface DisconnectBankCommand {
  workspaceId: string;
  connectionId: string;
}

export class DisconnectBankHandler {
  constructor(
    private readonly connectionRepository: IBankConnectionRepository
  ) {}

  async handle(command: DisconnectBankCommand): Promise<CommandResult<void>> {
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
  }
}
