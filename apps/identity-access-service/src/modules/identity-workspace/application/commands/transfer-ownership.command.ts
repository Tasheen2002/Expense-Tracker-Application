import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';
import { WorkspaceManagementService } from '../services/workspace-management.service';
import { OperationService } from '../services/operation.service';
import { WorkspaceRole } from '../../domain/entities/workspace-membership.entity';
import { WorkspaceDTO } from '../../domain/entities/workspace.entity';

export interface TransferOwnershipCommand extends ICommand {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly newOwnerId: string;
}

export class TransferOwnershipHandler implements ICommandHandler<TransferOwnershipCommand, CommandResult<WorkspaceDTO>> {
  constructor(
    private readonly service: WorkspaceManagementService,
    private readonly operations: OperationService
  ) {}

  async handle(command: TransferOwnershipCommand): Promise<CommandResult<WorkspaceDTO>> {
    const data = await this.operations.execute(
      { actorId: command.actorId, workspaceId: command.workspaceId, role: WorkspaceRole.OWNER },
      async () => {
        return this.service.transferOwnership(command.workspaceId, command.newOwnerId);
      }
    );
    return CommandResult.success(data);
  }
}
