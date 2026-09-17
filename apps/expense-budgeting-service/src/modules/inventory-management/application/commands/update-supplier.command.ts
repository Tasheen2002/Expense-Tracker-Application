import { SupplierService } from '../services/supplier.service';
import { SupplierDTO } from '../../domain/entities/supplier.entity';
import {
  ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';



export interface UpdateSupplierCommand extends ICommand {
  readonly supplierId: string;
  readonly workspaceId: string;
  readonly name?: string;
  readonly contactEmail?: string | null;
  readonly contactPhone?: string | null;
  readonly address?: string | null;
}

export class UpdateSupplierHandler
  implements ICommandHandler<UpdateSupplierCommand, CommandResult<SupplierDTO>>
{
  constructor(private readonly supplierService: SupplierService) {}

  async handle(command: UpdateSupplierCommand): Promise<CommandResult<SupplierDTO>> {
    const supplier = await this.supplierService.updateSupplier(
      command.supplierId,
      command.workspaceId,
      {
        name: command.name,
        contactEmail: command.contactEmail,
        contactPhone: command.contactPhone,
        address: command.address,
      }
    );
    return CommandResult.success(supplier);
  }
}
