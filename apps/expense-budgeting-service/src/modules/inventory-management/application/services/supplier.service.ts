import { ISupplierRepository } from '../../domain/repositories/supplier.repository';
import { Supplier, SupplierDTO } from '../../domain/entities/supplier.entity';
import { SupplierId } from '../../domain/value-objects/supplier-id.vo';
import {
  SupplierNotFoundError,
  SupplierAlreadyExistsError,
} from '../../domain/errors/inventory.errors';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export class SupplierService {
  constructor(private readonly supplierRepository: ISupplierRepository) {}

  async createSupplier(params: {
    workspaceId: string;
    name: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
  }): Promise<SupplierDTO> {
    const nameExists = await this.supplierRepository.existsByName(
      params.name,
      params.workspaceId
    );
    if (nameExists) {
      throw new SupplierAlreadyExistsError(params.name, params.workspaceId);
    }

    const supplier = Supplier.create(params);
    await this.supplierRepository.save(supplier);
    return Supplier.toDTO(supplier);
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
  ): Promise<SupplierDTO> {
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
    return Supplier.toDTO(supplier);
  }

  async deleteSupplier(supplierId: string, workspaceId: string): Promise<void> {
    const supplier = await this.supplierRepository.findById(
      SupplierId.fromString(supplierId),
      workspaceId
    );
    if (!supplier) {
      throw new SupplierNotFoundError(supplierId, workspaceId);
    }
    supplier.markAsDeleted();
    await this.supplierRepository.delete(
      SupplierId.fromString(supplierId),
      workspaceId
    );
  }

  async getSupplierById(
    supplierId: string,
    workspaceId: string
  ): Promise<SupplierDTO | null> {
    const supplier = await this.supplierRepository.findById(
      SupplierId.fromString(supplierId),
      workspaceId
    );
    return supplier ? Supplier.toDTO(supplier) : null;
  }

  async getSuppliersByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<SupplierDTO>> {
    const result = await this.supplierRepository.findByWorkspace(workspaceId, options);
    return {
      items: result.items.map((s) => Supplier.toDTO(s)),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };
  }
}
