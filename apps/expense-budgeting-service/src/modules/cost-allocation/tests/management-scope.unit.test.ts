import { describe, expect, it, vi } from 'vitest';
import { WorkspaceId } from '@core/domain/value-objects';
import { AllocationManagementService } from '../application/services/allocation-management.service';
import { Department } from '../domain/entities/department.entity';
import { CostCenter } from '../domain/entities/cost-center.entity';
import { Project } from '../domain/entities/project.entity';
import { IDepartmentRepository } from '../domain/repositories/department.repository';
import { ICostCenterRepository } from '../domain/repositories/cost-center.repository';
import { IProjectRepository } from '../domain/repositories/project.repository';
import { IWorkspaceAccessPort } from '../application/ports/workspace-access.port';
import { InvalidDepartmentHierarchyError, UnauthorizedAllocationAccessError } from '../domain/errors/cost-allocation.errors';

const workspaceId = WorkspaceId.create();
const otherWorkspaceId = WorkspaceId.create();
const actorId = '11111111-1111-4111-8111-111111111111';

function serviceWith(findById: ReturnType<typeof vi.fn>) {
  const departmentRepository = { findById, save: vi.fn(), findByCode: vi.fn().mockResolvedValue(null) } as unknown as IDepartmentRepository;
  const service = new AllocationManagementService(
    departmentRepository,
    {} as ICostCenterRepository,
    {} as IProjectRepository,
    { isAdminOrOwner: vi.fn().mockResolvedValue(true), isMember: vi.fn().mockResolvedValue(true) } as IWorkspaceAccessPort,
  );
  return { service, departmentRepository };
}

describe('department hierarchy and workspace scope', () => {
  it('denies every management read before touching a repository', async () => {
    const departmentRepository = { findById: vi.fn(), findAll: vi.fn() };
    const costCenterRepository = { findById: vi.fn(), findAll: vi.fn() };
    const projectRepository = { findById: vi.fn(), findAll: vi.fn() };
    const isMember = vi.fn().mockResolvedValue(false);
    const service = new AllocationManagementService(
      departmentRepository as unknown as IDepartmentRepository,
      costCenterRepository as unknown as ICostCenterRepository,
      projectRepository as unknown as IProjectRepository,
      { isMember } as unknown as IWorkspaceAccessPort,
    );
    const scope = workspaceId.getValue();
    const id = Department.create({ workspaceId, name: 'Alpha', code: 'AA' }).id.getValue();
    const reads = [
      () => service.getDepartment(id, scope, actorId),
      () => service.listDepartments(scope, actorId),
      () => service.getCostCenter(id, scope, actorId),
      () => service.listCostCenters(scope, actorId),
      () => service.getProject(id, scope, actorId),
      () => service.listProjects(scope, actorId),
    ];
    for (const read of reads) {
      await expect(read()).rejects.toThrow(UnauthorizedAllocationAccessError);
    }
    expect(isMember).toHaveBeenCalledTimes(6);
    for (const repository of [departmentRepository, costCenterRepository, projectRepository]) {
      expect(repository.findById).not.toHaveBeenCalled();
      expect(repository.findAll).not.toHaveBeenCalled();
    }
  });

  it('passes workspace scope into a single-record lookup', async () => {
    const findById = vi.fn().mockResolvedValue(null);
    const { service } = serviceWith(findById);
    await expect(service.getDepartment(Department.create({ workspaceId, name: 'Alpha', code: 'AA' }).id.getValue(), otherWorkspaceId.getValue(), actorId))
      .rejects.toThrow();
    expect(findById.mock.calls[0][1].getValue()).toBe(otherWorkspaceId.getValue());
  });

  it('rejects a parent from another workspace', async () => {
    const findById = vi.fn().mockResolvedValue(null);
    const { service, departmentRepository } = serviceWith(findById);
    await expect(service.createDepartment({
      workspaceId: workspaceId.getValue(), actorId, name: 'Child', code: 'CHILD',
      parentDepartmentId: Department.create({ workspaceId: otherWorkspaceId, name: 'Other', code: 'OTHER' }).id.getValue(),
    })).rejects.toThrow(InvalidDepartmentHierarchyError);
    expect(departmentRepository.save).not.toHaveBeenCalled();
  });

  it('rejects cycles when changing a department parent', async () => {
    const department = Department.create({ workspaceId, name: 'Alpha', code: 'AA' });
    const child = Department.create({ workspaceId, name: 'Beta', code: 'BB', parentDepartmentId: department.id });
    const findById = vi.fn().mockImplementation(async (id) =>
      id.getValue() === department.id.getValue() ? department : child,
    );
    const { service, departmentRepository } = serviceWith(findById);
    await expect(service.updateDepartment({
      id: department.id.getValue(), workspaceId: workspaceId.getValue(), actorId,
      parentDepartmentId: child.id.getValue(),
    })).rejects.toThrow(InvalidDepartmentHierarchyError);
    expect(departmentRepository.save).not.toHaveBeenCalled();
  });

  it('treats repeated management deletes as one deactivation', async () => {
    const department = Department.create({ workspaceId, name: 'Engineering', code: 'ENG' });
    const center = CostCenter.create({ workspaceId, name: 'Operations', code: 'OPS' });
    const project = Project.create({ workspaceId, name: 'Launch', code: 'PRJ', startDate: new Date() });
    const departmentRepository = { findById: vi.fn().mockResolvedValue(department), save: vi.fn() };
    const costCenterRepository = { findById: vi.fn().mockResolvedValue(center), save: vi.fn() };
    const projectRepository = { findById: vi.fn().mockResolvedValue(project), save: vi.fn() };
    const service = new AllocationManagementService(
      departmentRepository as unknown as IDepartmentRepository,
      costCenterRepository as unknown as ICostCenterRepository,
      projectRepository as unknown as IProjectRepository,
      { isAdminOrOwner: vi.fn().mockResolvedValue(true), isMember: vi.fn().mockResolvedValue(true) } as IWorkspaceAccessPort,
    );

    department.clearDomainEvents();
    center.clearDomainEvents();
    project.clearDomainEvents();
    for (let attempt = 0; attempt < 2; attempt++) {
      await service.deleteDepartment(department.id.getValue(), workspaceId.getValue(), actorId);
      await service.deleteCostCenter(center.id.getValue(), workspaceId.getValue(), actorId);
      await service.deleteProject(project.id.getValue(), workspaceId.getValue(), actorId);
    }
    expect(departmentRepository.save).toHaveBeenCalledTimes(1);
    expect(costCenterRepository.save).toHaveBeenCalledTimes(1);
    expect(projectRepository.save).toHaveBeenCalledTimes(1);
    expect(department.domainEvents.map((event) => event.eventType)).toEqual(['DepartmentDeactivated']);
    expect(center.domainEvents.map((event) => event.eventType)).toEqual(['CostCenterDeactivated']);
    expect(project.domainEvents.map((event) => event.eventType)).toEqual(['ProjectDeactivated']);
  });
});
