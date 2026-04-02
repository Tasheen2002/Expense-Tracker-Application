import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { UserId } from '../../../identity-workspace/domain/value-objects/user-id.vo';
import { BankConnection } from '../../domain/entities/bank-connection.entity';
import { IBankConnectionRepository } from '../../domain/repositories/bank-connection.repository';
import { BankConnectionAlreadyExistsError } from '../../domain/errors/bank-feed-sync.errors';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface ConnectBankResult {
  id: string;
  institutionName: string;
  accountName: string;
  status: string;
}

export interface ConnectBankCommand extends ICommand {
  workspaceId: string;
  userId: string;
  institutionId: string;
  institutionName: string;
  accountId: string;
  accountName: string;
  accountType: string;
  currency: string;
  accessToken: string;
  accountMask?: string;
  tokenExpiresAt?: Date;
}

export class ConnectBankHandler implements ICommandHandler<
  ConnectBankCommand,
  CommandResult<ConnectBankResult>
> {
  constructor(
    private readonly connectionRepository: IBankConnectionRepository
  ) {}

  async handle(
    command: ConnectBankCommand
  ): Promise<CommandResult<ConnectBankResult>> {
    const workspaceId = WorkspaceId.fromString(command.workspaceId);
    const userId = UserId.fromString(command.userId);

    const existing =
      await this.connectionRepository.findByInstitutionAndAccount(
        workspaceId,
        command.institutionId,
        command.accountId
      );

    if (existing) {
      throw new BankConnectionAlreadyExistsError(
        command.institutionId,
        command.accountId
      );
    }

    const connection = BankConnection.create(
      workspaceId,
      userId,
      command.institutionId,
      command.institutionName,
      command.accountId,
      command.accountName,
      command.accountType,
      command.currency,
      command.accessToken,
      command.accountMask,
      command.tokenExpiresAt
    );

    connection.activate();
    await this.connectionRepository.save(connection);

    const result: ConnectBankResult = {
      id: connection.getId().getValue(),
      institutionName: connection.institutionName,
      accountName: connection.accountName,
      status: connection.status,
    };

    return CommandResult.success(result);
  }
}
