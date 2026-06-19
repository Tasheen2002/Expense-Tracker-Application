import { SupplierService } from '../services/supplier.service';
import { SupplierDTO } from '../../domain/entities/supplier.entity';
import {
  ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';



export interface CreateSupplierCommand extends ICommand {
  readonly workspaceId: string;
  readonly name: string;
  readonly contactEmail?: string;
  readonly contactPhone?: string;
  readonly address?: string;
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
