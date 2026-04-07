import { SupplierService } from '../services/supplier.service';
import { SupplierDTO } from '../../domain/entities/supplier.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface CreateSupplierCommand extends ICommand {
  workspaceId: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

export class CreateSupplierHandler
  implements ICommandHandler<CreateSupplierCommand, CommandResult<SupplierDTO>>
{
  constructor(private readonly supplierService: SupplierService) {}

  async handle(command: CreateSupplierCommand): Promise<CommandResult<SupplierDTO>> {
    const supplier = await this.supplierService.createSupplier(command);
    return CommandResult.success(supplier);
  }
}
