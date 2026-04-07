import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import { SupplierService } from '../application/services/supplier.service';
import { ISupplierRepository } from '../domain/repositories/supplier.repository';
import { Supplier } from '../domain/entities/supplier.entity';
import {
  SupplierNotFoundError,
  SupplierAlreadyExistsError,
} from '../domain/errors/inventory.errors';

const mockSupplierRepository = {
  save: vi.fn(),
  findById: vi.fn(),
  findByWorkspace: vi.fn(),
  delete: vi.fn(),
  exists: vi.fn(),
  existsByName: vi.fn(),
} as unknown as ISupplierRepository;

describe('SupplierService', () => {
  let service: SupplierService;

  beforeEach(() => {
    service = new SupplierService(mockSupplierRepository);
    vi.clearAllMocks();
  });

  describe('createSupplier', () => {
    it('should create and save a new supplier', async () => {
      vi.mocked(mockSupplierRepository.existsByName).mockResolvedValue(false);

      const supplier = await service.createSupplier({
        workspaceId: 'workspace-123',
        name: 'Acme Corp',
      });

      expect(supplier).toBeDefined();
      expect(supplier.name).toBe('Acme Corp');
      expect(mockSupplierRepository.save).toHaveBeenCalledWith(supplier);
    });

    it('should throw error for duplicate name', async () => {
      vi.mocked(mockSupplierRepository.existsByName).mockResolvedValue(true);

      await expect(
        service.createSupplier({
          workspaceId: 'workspace-123',
          name: 'Existing Corp',
        })
      ).rejects.toThrow(SupplierAlreadyExistsError);
    });
  });

  describe('updateSupplier', () => {
    it('should update supplier fields', async () => {
      const existingSupplier = Supplier.create({
        workspaceId: 'workspace-123',
        name: 'Old Name',
      });
      vi.mocked(mockSupplierRepository.findById).mockResolvedValue(existingSupplier);
      vi.mocked(mockSupplierRepository.existsByName).mockResolvedValue(false);

      const updated = await service.updateSupplier(
        existingSupplier.id.getValue(),
        'workspace-123',
        {
          name: 'New Name',
          contactEmail: 'new@email.com',
        }
      );

      expect(updated.name).toBe('New Name');
      expect(updated.contactEmail).toBe('new@email.com');
      expect(mockSupplierRepository.save).toHaveBeenCalled();
    });

    it('should throw error when supplier not found', async () => {
      vi.mocked(mockSupplierRepository.findById).mockResolvedValue(null);

      await expect(
        service.updateSupplier(
          randomUUID(),
          'workspace-123',
          { name: 'Updated' }
        )
      ).rejects.toThrow(SupplierNotFoundError);
    });
  });

  describe('deleteSupplier', () => {
    it('should delete existing supplier', async () => {
      const supplierId = randomUUID();
      vi.mocked(mockSupplierRepository.exists).mockResolvedValue(true);

      await service.deleteSupplier(supplierId, 'workspace-123');

      expect(mockSupplierRepository.delete).toHaveBeenCalled();
    });

    it('should throw error when supplier not found', async () => {
      const supplierId = randomUUID();
      vi.mocked(mockSupplierRepository.exists).mockResolvedValue(false);

      await expect(
        service.deleteSupplier(supplierId, 'workspace-123')
      ).rejects.toThrow(SupplierNotFoundError);
    });
  });
});
