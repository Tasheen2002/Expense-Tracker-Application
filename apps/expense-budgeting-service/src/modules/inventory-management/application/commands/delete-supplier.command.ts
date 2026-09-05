import { SupplierService } from '../services/supplier.service';
import {
  ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';



export interface DeleteSupplierCommand extends ICommand {
  readonly supplierId: string;
  readonly workspaceId: string;
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
