import { WorkspaceId, UserId } from '../../../identity-workspace';
import { BankConnection } from '../../domain/entities/bank-connection.entity';
import { IBankConnectionRepository } from '../../domain/repositories/bank-connection.repository';
import { BankConnectionAlreadyExistsError } from '../../domain/errors';
import { ICommand, ICommandHandler, CommandResult } from '../../../../apps/api/src/shared/application';
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

export class ConnectBankHandler implements ICommandHandler<ConnectBankCommand, CommandResult<{ connectionId: string }>> {
  constructor(
    private readonly connectionRepository: IBankConnectionRepository
  ) {}

  async handle(
    command: ConnectBankCommand
  ): Promise<CommandResult<{ connectionId: string }>> {
    try {
      
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
      
          return CommandResult.success({
            connectionId: connection.getId().getValue(),
          });
        
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
