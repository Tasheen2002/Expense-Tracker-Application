import { describe, it, expect } from 'vitest';
import { Supplier } from '../domain/entities/supplier.entity';
import { InvalidInventoryDataError } from '../domain/errors/inventory.errors';

describe('Supplier Entity', () => {
  const validData = {
    workspaceId: 'workspace-123',
    name: 'Acme Corp',
    contactEmail: 'contact@acme.com',
    contactPhone: '+1234567890',
    address: '123 Main St',
  };

  describe('create', () => {
    it('should create a valid supplier', () => {
      const supplier = Supplier.create(validData);
      expect(supplier).toBeDefined();
      expect(supplier.id).toBeDefined();
      expect(supplier.name).toBe('Acme Corp');
      expect(supplier.workspaceId).toBe('workspace-123');
      expect(supplier.contactEmail).toBe('contact@acme.com');
      expect(supplier.isActive).toBe(true);
    });

    it('should create supplier with minimal data', () => {
      const supplier = Supplier.create({
        workspaceId: 'workspace-123',
        name: 'Minimal Supplier',
      });
      expect(supplier.contactEmail).toBeNull();
      expect(supplier.contactPhone).toBeNull();
      expect(supplier.address).toBeNull();
    });

    it('should throw error for empty name', () => {
      expect(() => {
        Supplier.create({ ...validData, name: '' });
      }).toThrow(InvalidInventoryDataError);
    });

    it('should throw error for name exceeding max length', () => {
      expect(() => {
        Supplier.create({ ...validData, name: 'a'.repeat(256) });
      }).toThrow(InvalidInventoryDataError);
    });

    it('should trim the name', () => {
      const supplier = Supplier.create({ ...validData, name: '  Trimmed Corp  ' });
      expect(supplier.name).toBe('Trimmed Corp');
    });
  });

  describe('updateName', () => {
    it('should update name', () => {
      const supplier = Supplier.create(validData);
      supplier.updateName('New Name');
      expect(supplier.name).toBe('New Name');
    });

    it('should throw error for empty name', () => {
      const supplier = Supplier.create(validData);
      expect(() => {
        supplier.updateName('');
      }).toThrow(InvalidInventoryDataError);
    });
  });

  describe('deactivate / activate', () => {
    it('should deactivate supplier', () => {
      const supplier = Supplier.create(validData);
      supplier.deactivate();
      expect(supplier.isActive).toBe(false);
    });

    it('should activate supplier', () => {
      const supplier = Supplier.create(validData);
      supplier.deactivate();
      supplier.activate();
      expect(supplier.isActive).toBe(true);
    });
  });

  describe('toDTO', () => {
    it('should convert to DTO correctly', () => {
      const supplier = Supplier.create(validData);
      const dto = Supplier.toDTO(supplier);
      expect(dto.supplierId).toBe(supplier.id.getValue());
      expect(dto.name).toBe('Acme Corp');
      expect(dto.contactEmail).toBe('contact@acme.com');
      expect(dto.isActive).toBe(true);
      expect(dto.createdAt).toBeDefined();
    });
  });
});
