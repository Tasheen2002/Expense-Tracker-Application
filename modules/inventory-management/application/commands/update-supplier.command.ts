import { SupplierService } from '../services/supplier.service';
import { SupplierDTO } from '../../domain/entities/supplier.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface UpdateSupplierCommand extends ICommand {
  supplierId: string;
  workspaceId: string;
  name?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
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
