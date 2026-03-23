import { WorkspaceId } from '../../../identity-workspace';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { IBankConnectionRepository } from '../../domain/repositories/bank-connection.repository';
import { BankConnectionNotFoundError } from '../../domain/errors';
import { ICommand, ICommandHandler, CommandResult } from '../../../../apps/api/src/shared/application';
export interface DeleteConnectionCommand extends ICommand {
  workspaceId: string;
  connectionId: string;
}

export class DeleteConnectionHandler implements ICommandHandler<DeleteConnectionCommand, CommandResult<void>> {
  constructor(
    private readonly connectionRepository: IBankConnectionRepository
  ) {}

  async handle(command: DeleteConnectionCommand): Promise<CommandResult<void>> {
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
      
          await this.connectionRepository.delete(connectionId, workspaceId);
      
          return CommandResult.success();
        
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
