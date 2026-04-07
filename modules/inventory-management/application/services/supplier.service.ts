import { ISupplierRepository } from '../../domain/repositories/supplier.repository';
import { Supplier } from '../../domain/entities/supplier.entity';
import { SupplierId } from '../../domain/value-objects/supplier-id.vo';
import {
  SupplierNotFoundError,
  SupplierAlreadyExistsError,
} from '../../domain/errors/inventory.errors';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export class SupplierService {
  constructor(private readonly supplierRepository: ISupplierRepository) {}

  async createSupplier(params: {
    workspaceId: string;
    name: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
  }): Promise<Supplier> {
    const nameExists = await this.supplierRepository.existsByName(
      params.name,
      params.workspaceId
    );
    if (nameExists) {
      throw new SupplierAlreadyExistsError(params.name, params.workspaceId);
    }

    const supplier = Supplier.create(params);
    await this.supplierRepository.save(supplier);
    return supplier;
  }

  async updateSupplier(
    supplierId: string,
    workspaceId: string,
    updates: {
      name?: string;
      contactEmail?: string | null;
      contactPhone?: string | null;
      address?: string | null;
    }
  ): Promise<Supplier> {
    const supplier = await this.supplierRepository.findById(
      SupplierId.fromString(supplierId),
      workspaceId
    );
    if (!supplier) {
      throw new SupplierNotFoundError(supplierId, workspaceId);
    }

    if (updates.name !== undefined) {
      if (updates.name !== supplier.name) {
        const nameExists = await this.supplierRepository.existsByName(
          updates.name,
          workspaceId
        );
        if (nameExists) {
          throw new SupplierAlreadyExistsError(updates.name, workspaceId);
        }
      }
      supplier.updateName(updates.name);
    }
    if (updates.contactEmail !== undefined) {
      supplier.updateContactEmail(updates.contactEmail);
    }
    if (updates.contactPhone !== undefined) {
      supplier.updateContactPhone(updates.contactPhone);
    }
    if (updates.address !== undefined) {
      supplier.updateAddress(updates.address);
    }

    await this.supplierRepository.save(supplier);
    return supplier;
  }

  async deleteSupplier(supplierId: string, workspaceId: string): Promise<void> {
    const exists = await this.supplierRepository.exists(
      SupplierId.fromString(supplierId),
      workspaceId
    );
    if (!exists) {
      throw new SupplierNotFoundError(supplierId, workspaceId);
    }
    await this.supplierRepository.delete(
      SupplierId.fromString(supplierId),
      workspaceId
    );
  }

  async getSupplierById(
    supplierId: string,
    workspaceId: string
  ): Promise<Supplier | null> {
    return this.supplierRepository.findById(
      SupplierId.fromString(supplierId),
      workspaceId
    );
  }

  async getSuppliersByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Supplier>> {
    return this.supplierRepository.findByWorkspace(workspaceId, options);
  }
}
