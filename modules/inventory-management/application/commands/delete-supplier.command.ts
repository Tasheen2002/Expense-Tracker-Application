import { SupplierService } from '../services/supplier.service';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface DeleteSupplierCommand extends ICommand {
  supplierId: string;
  workspaceId: string;
}

export class DeleteSupplierHandler
  implements ICommandHandler<DeleteSupplierCommand, CommandResult<void>>
{
  constructor(private readonly supplierService: SupplierService) {}

  async handle(command: DeleteSupplierCommand): Promise<CommandResult<void>> {
    await this.supplierService.deleteSupplier(command.supplierId, command.workspaceId);
    return CommandResult.success(undefined);
  }
}
