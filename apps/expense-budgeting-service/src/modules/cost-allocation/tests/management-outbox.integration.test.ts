import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { InMemoryEventBus } from '@expense-tracker/core';
import { WorkspaceId } from '@core/domain/value-objects';
import { Department } from '../domain/entities/department.entity';
import { CostCenter } from '../domain/entities/cost-center.entity';
import { Project } from '../domain/entities/project.entity';
import { DepartmentRepositoryImpl } from '../infrastructure/persistence/department.repository.impl';
import { CostCenterRepositoryImpl } from '../infrastructure/persistence/cost-center.repository.impl';
import { ProjectRepositoryImpl } from '../infrastructure/persistence/project.repository.impl';
import { DuplicateDepartmentCodeError, DuplicateCostCenterCodeError, DuplicateProjectCodeError } from '../domain/errors/cost-allocation.errors';
import { ManagementConcurrencyConflictError } from '../domain/errors/cost-allocation.errors';
import { PrismaUnitOfWork } from '../../../shared/infrastructure/persistence/prisma-unit-of-work';

const prisma = new PrismaClient();
const workspaceId = WorkspaceId.create();
const department = Department.create({ workspaceId, name: 'Engineering', code: 'ENG' });
const center = CostCenter.create({ workspaceId, name: 'Operations', code: 'OPS' });
const project = Project.create({ workspaceId, name: 'Launch', code: 'PRJ', startDate: new Date() });
const ids = [department.id.getValue(), center.id.getValue(), project.id.getValue()];
const successfulDepartment = Department.create({ workspaceId, name: 'Finance', code: 'FIN' });
const successfulCenter = CostCenter.create({ workspaceId, name: 'Finance center', code: 'FINC' });
const successfulProject = Project.create({ workspaceId, name: 'Finance launch', code: 'FINP', startDate: new Date() });
ids.push(successfulDepartment.id.getValue(), successfulCenter.id.getValue(), successfulProject.id.getValue());

describe('management repository outbox atomicity', () => {
  afterAll(async () => {
    await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: ids } } });
    await prisma.department.deleteMany({ where: { id: { in: ids } } });
    await prisma.costCenter.deleteMany({ where: { id: { in: ids } } });
    await prisma.project.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it('rolls back each entity write when its outbox write fails', async () => {
    const failingPrisma = prisma.$extends({
      query: {
        outboxEvent: {
          async createMany() {
            throw new Error('outbox unavailable');
          },
        },
      },
    });
    const eventBus = new InMemoryEventBus();
    const cases = [
      {
        save: () => new DepartmentRepositoryImpl(failingPrisma as unknown as PrismaClient, eventBus).save(department),
        find: () => prisma.department.findUnique({ where: { id: department.id.getValue() } }),
      },
      {
        save: () => new CostCenterRepositoryImpl(failingPrisma as unknown as PrismaClient, eventBus).save(center),
        find: () => prisma.costCenter.findUnique({ where: { id: center.id.getValue() } }),
      },
      {
        save: () => new ProjectRepositoryImpl(failingPrisma as unknown as PrismaClient, eventBus).save(project),
        find: () => prisma.project.findUnique({ where: { id: project.id.getValue() } }),
      },
    ];
    for (const entry of cases) {
      await expect(entry.save()).rejects.toThrow('outbox unavailable');
      expect(await entry.find()).toBeNull();
    }
  });

  it('commits each management entity with its outbox event', async () => {
    const eventBus = new InMemoryEventBus();
    await new DepartmentRepositoryImpl(prisma, eventBus).save(successfulDepartment);
    await new CostCenterRepositoryImpl(prisma, eventBus).save(successfulCenter);
    await new ProjectRepositoryImpl(prisma, eventBus).save(successfulProject);
    for (const id of [successfulDepartment.id.getValue(), successfulCenter.id.getValue(), successfulProject.id.getValue()]) {
      expect(await prisma.outboxEvent.count({ where: { aggregateId: id } })).toBe(1);
    }
  });

  it('orders paginated management records and keeps inactive records available', async () => {
    const scope = WorkspaceId.create();
    const eventBus = new InMemoryEventBus();
    const departments = new DepartmentRepositoryImpl(prisma, eventBus);
    const centers = new CostCenterRepositoryImpl(prisma, eventBus);
    const projects = new ProjectRepositoryImpl(prisma, eventBus);

    for (const [name, code] of [['Gamma', 'GAM'], ['Alpha', 'ALP'], ['Beta', 'BET']]) {
      const department = Department.create({ workspaceId: scope, name, code });
      const center = CostCenter.create({ workspaceId: scope, name, code });
      const project = Project.create({ workspaceId: scope, name, code, startDate: new Date() });
      ids.push(department.id.getValue(), center.id.getValue(), project.id.getValue());
      await departments.save(department);
      await centers.save(center);
      await projects.save(project);
      if (name === 'Beta') {
        department.deactivate();
        center.deactivate();
        project.deactivate();
        await departments.save(department);
        await centers.save(center);
        await projects.save(project);
      }
    }

    for (const repository of [departments, centers, projects]) {
      const ascending = await repository.findAll(scope, { sortBy: 'name', sortOrder: 'asc' });
      expect(ascending.items.map((item) => item.name)).toEqual(['Alpha', 'Beta', 'Gamma']);
      expect(ascending.items.find((item) => item.name === 'Beta')?.isActive).toBe(false);

      const descending = await repository.findAll(scope, { sortBy: 'name', sortOrder: 'desc' });
      expect(descending.items.map((item) => item.name)).toEqual(['Gamma', 'Beta', 'Alpha']);

      const first = await repository.findAll(scope, { limit: 1, offset: 0 });
      const firstAgain = await repository.findAll(scope, { limit: 1, offset: 0 });
      const second = await repository.findAll(scope, { limit: 1, offset: 1 });
      expect(first.items[0]?.id.getValue()).toBe(firstAgain.items[0]?.id.getValue());
      expect(second.items[0]?.id.getValue()).not.toBe(first.items[0]?.id.getValue());

      await expect(repository.findAll(scope, { sortBy: 'workspaceId' })).rejects.toMatchObject({
        code: 'INVALID_MANAGEMENT_SORT',
        statusCode: 400,
      });
    }
  });

  it('never updates an existing management record through another workspace', async () => {
    const owner = WorkspaceId.create();
    const foreign = WorkspaceId.create();
    const eventBus = new InMemoryEventBus();
    const departmentRepo = new DepartmentRepositoryImpl(prisma, eventBus);
    const centerRepo = new CostCenterRepositoryImpl(prisma, eventBus);
    const projectRepo = new ProjectRepositoryImpl(prisma, eventBus);
    const originalDepartment = Department.create({ workspaceId: owner, name: 'Owner department', code: 'OWND' });
    const originalCenter = CostCenter.create({ workspaceId: owner, name: 'Owner center', code: 'OWNC' });
    const originalProject = Project.create({ workspaceId: owner, name: 'Owner project', code: 'OWNP', startDate: new Date() });
    ids.push(originalDepartment.id.getValue(), originalCenter.id.getValue(), originalProject.id.getValue());
    await departmentRepo.save(originalDepartment);
    await centerRepo.save(originalCenter);
    await projectRepo.save(originalProject);

    const departmentRow = await prisma.department.findUniqueOrThrow({ where: { id: originalDepartment.id.getValue() } });
    const centerRow = await prisma.costCenter.findUniqueOrThrow({ where: { id: originalCenter.id.getValue() } });
    const projectRow = await prisma.project.findUniqueOrThrow({ where: { id: originalProject.id.getValue() } });

    await expect(departmentRepo.save(Department.fromPersistence({ ...departmentRow, workspaceId: foreign.getValue(), name: 'Hijacked' }))).rejects.not.toBeInstanceOf(DuplicateDepartmentCodeError);
    await expect(centerRepo.save(CostCenter.fromPersistence({ ...centerRow, workspaceId: foreign.getValue(), name: 'Hijacked' }))).rejects.not.toBeInstanceOf(DuplicateCostCenterCodeError);
    await expect(projectRepo.save(Project.fromPersistence({ ...projectRow, workspaceId: foreign.getValue(), name: 'Hijacked', budget: projectRow.budget?.toNumber() ?? null }))).rejects.not.toBeInstanceOf(DuplicateProjectCodeError);

    expect((await departmentRepo.findById(originalDepartment.id, owner))?.name).toBe('Owner department');
    expect((await centerRepo.findById(originalCenter.id, owner))?.name).toBe('Owner center');
    expect((await projectRepo.findById(originalProject.id, owner))?.name).toBe('Owner project');
  });

  it('maps create and update code races to the matching domain conflict', async () => {
    const scope = WorkspaceId.create();
    const eventBus = new InMemoryEventBus();
    const departments = new DepartmentRepositoryImpl(prisma, eventBus);
    const centers = new CostCenterRepositoryImpl(prisma, eventBus);
    const projects = new ProjectRepositoryImpl(prisma, eventBus);
    const firstDepartment = Department.create({ workspaceId: scope, name: 'First department', code: 'FIRST' });
    const secondDepartment = Department.create({ workspaceId: scope, name: 'Second department', code: 'SECOND' });
    const duplicateDepartment = Department.create({ workspaceId: scope, name: 'Duplicate department', code: 'FIRST' });
    const firstCenter = CostCenter.create({ workspaceId: scope, name: 'First center', code: 'FIRST' });
    const secondCenter = CostCenter.create({ workspaceId: scope, name: 'Second center', code: 'SECOND' });
    const duplicateCenter = CostCenter.create({ workspaceId: scope, name: 'Duplicate center', code: 'FIRST' });
    const firstProject = Project.create({ workspaceId: scope, name: 'First project', code: 'FIRST', startDate: new Date() });
    const secondProject = Project.create({ workspaceId: scope, name: 'Second project', code: 'SECOND', startDate: new Date() });
    const duplicateProject = Project.create({ workspaceId: scope, name: 'Duplicate project', code: 'FIRST', startDate: new Date() });
    ids.push(...[
      firstDepartment, secondDepartment, duplicateDepartment,
      firstCenter, secondCenter, duplicateCenter,
      firstProject, secondProject, duplicateProject,
    ].map((entity) => entity.id.getValue()));

    await departments.save(firstDepartment);
    await departments.save(secondDepartment);
    await centers.save(firstCenter);
    await centers.save(secondCenter);
    await projects.save(firstProject);
    await projects.save(secondProject);

    await expect(departments.save(duplicateDepartment)).rejects.toThrow(DuplicateDepartmentCodeError);
    await expect(centers.save(duplicateCenter)).rejects.toThrow(DuplicateCostCenterCodeError);
    await expect(projects.save(duplicateProject)).rejects.toThrow(DuplicateProjectCodeError);

    secondDepartment.updateDetails({ code: 'FIRST' });
    secondCenter.updateDetails({ code: 'FIRST' });
    secondProject.updateDetails({ code: 'FIRST' });
    await expect(departments.save(secondDepartment)).rejects.toThrow(DuplicateDepartmentCodeError);
    await expect(centers.save(secondCenter)).rejects.toThrow(DuplicateCostCenterCodeError);
    await expect(projects.save(secondProject)).rejects.toThrow(DuplicateProjectCodeError);
    expect((await prisma.department.findUniqueOrThrow({ where: { id: secondDepartment.id.getValue() } })).code).toBe('SECOND');
    expect((await prisma.costCenter.findUniqueOrThrow({ where: { id: secondCenter.id.getValue() } })).code).toBe('SECOND');
    expect((await prisma.project.findUniqueOrThrow({ where: { id: secondProject.id.getValue() } })).code).toBe('SECOND');
  });

  it('rejects stale writes for every management repository', async () => {
    const scope = WorkspaceId.create();
    const bus = new InMemoryEventBus();
    const departments = new DepartmentRepositoryImpl(prisma, bus);
    const centers = new CostCenterRepositoryImpl(prisma, bus);
    const projects = new ProjectRepositoryImpl(prisma, bus);
    const department = Department.create({ workspaceId: scope, name: 'Initial department', code: 'VERD' });
    const center = CostCenter.create({ workspaceId: scope, name: 'Initial center', code: 'VERC' });
    const project = Project.create({ workspaceId: scope, name: 'Initial project', code: 'VERP', startDate: new Date() });
    ids.push(department.id.getValue(), center.id.getValue(), project.id.getValue());
    await departments.save(department);
    await centers.save(center);
    await projects.save(project);

    const departmentA = (await departments.findById(department.id, scope))!;
    const departmentB = (await departments.findById(department.id, scope))!;
    const centerA = (await centers.findById(center.id, scope))!;
    const centerB = (await centers.findById(center.id, scope))!;
    const projectA = (await projects.findById(project.id, scope))!;
    const projectB = (await projects.findById(project.id, scope))!;
    departmentA.updateDetails({ name: 'Winning department' });
    departmentB.updateDetails({ name: 'Stale department' });
    centerA.updateDetails({ name: 'Winning center' });
    centerB.updateDetails({ name: 'Stale center' });
    projectA.updateDetails({ name: 'Winning project' });
    projectB.updateDetails({ name: 'Stale project' });

    await departments.save(departmentA);
    await centers.save(centerA);
    await projects.save(projectA);
    await expect(departments.save(departmentB)).rejects.toThrow(ManagementConcurrencyConflictError);
    await expect(centers.save(centerB)).rejects.toThrow(ManagementConcurrencyConflictError);
    await expect(projects.save(projectB)).rejects.toThrow(ManagementConcurrencyConflictError);
    expect((await departments.findById(department.id, scope))?.name).toBe('Winning department');
    expect((await centers.findById(center.id, scope))?.name).toBe('Winning center');
    expect((await projects.findById(project.id, scope))?.name).toBe('Winning project');
    expect(departmentB.domainEvents).toHaveLength(1);
  });

  it('restores events and entity version when an outer transaction rolls back', async () => {
    const scope = WorkspaceId.create();
    const entity = Department.create({ workspaceId: scope, name: 'Rollback department', code: 'ROLL' });
    ids.push(entity.id.getValue());
    const repository = new DepartmentRepositoryImpl(prisma, new InMemoryEventBus());
    await expect(new PrismaUnitOfWork(prisma).execute(async () => {
      await repository.save(entity);
      throw new Error('rollback creation');
    })).rejects.toThrow('rollback creation');
    expect(entity.domainEvents).toHaveLength(1);
    expect(await prisma.department.findUnique({ where: { id: entity.id.getValue() } })).toBeNull();

    await repository.save(entity);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: entity.id.getValue() } })).toBe(1);
    entity.updateDetails({ name: 'Updated after rollback' });
    const versionBefore = entity.version;
    await expect(new PrismaUnitOfWork(prisma).execute(async () => {
      await repository.save(entity);
      throw new Error('rollback update');
    })).rejects.toThrow('rollback update');
    expect(entity.version).toBe(versionBefore);
    expect(entity.domainEvents).toHaveLength(1);
    await repository.save(entity);
    expect(entity.version).toBe(versionBefore + 1);
    expect((await prisma.department.findUniqueOrThrow({ where: { id: entity.id.getValue() } })).name)
      .toBe('Updated after rollback');
    expect(await prisma.outboxEvent.count({ where: { aggregateId: entity.id.getValue() } })).toBe(2);
  });
});
