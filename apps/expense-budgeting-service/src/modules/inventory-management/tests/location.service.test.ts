import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocationService } from '../application/services/location.service';
import { Location } from '../domain/entities/location.entity';
import { LocationAlreadyExistsError, LocationNotFoundError } from '../domain/errors/inventory.errors';
import type { ILocationRepository } from '../domain/repositories/location.repository';

const repository = {
  save: vi.fn(),
  findById: vi.fn(),
  findByWorkspace: vi.fn(),
  delete: vi.fn(),
  exists: vi.fn(),
  existsByName: vi.fn(),
} as unknown as ILocationRepository;

describe('LocationService', () => {
  const service = new LocationService(repository);
  const workspaceId = randomUUID();

  beforeEach(() => { vi.resetAllMocks(); });

  it('checks the normalized name used for creation', async () => {
    vi.mocked(repository.existsByName).mockResolvedValue(true);

    await expect(service.createLocation({ workspaceId, name: '  Main  ' }))
      .rejects.toThrow(LocationAlreadyExistsError);
    expect(repository.existsByName).toHaveBeenCalledWith('Main', workspaceId);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('checks the normalized name used for an update', async () => {
    const location = Location.create({ workspaceId, name: 'Old' });
    vi.mocked(repository.findById).mockResolvedValue(location);
    vi.mocked(repository.existsByName).mockResolvedValue(true);

    await expect(service.updateLocation(location.id.getValue(), workspaceId, {
      name: '  Main  ',
    })).rejects.toThrow(LocationAlreadyExistsError);
    expect(repository.existsByName).toHaveBeenCalledWith('Main', workspaceId);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('keeps location reads scoped to the workspace', async () => {
    const locationId = randomUUID();
    vi.mocked(repository.findById).mockResolvedValue(null);

    await expect(service.deleteLocation(locationId, workspaceId))
      .rejects.toThrow(LocationNotFoundError);
    expect(repository.findById).toHaveBeenCalledWith(expect.anything(), workspaceId);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
