import { describe, expect, it } from 'vitest';
import { WorkspaceId } from '@core/domain/value-objects';
import { Department } from '../domain/entities/department.entity';
import { CostCenter } from '../domain/entities/cost-center.entity';
import { Project } from '../domain/entities/project.entity';
import { AllocationAmount } from '../domain/value-objects/allocation-amount';
import { DepartmentId } from '../domain/value-objects/department-id';
import { DepartmentCode } from '../domain/value-objects/department-code';
import { CostCenterCode } from '../domain/value-objects/cost-center-code';
import { ProjectCode } from '../domain/value-objects/project-code';
import { InvalidAllocationAmountError, InvalidAllocationNameError, InvalidCodeError, InvalidDepartmentHierarchyError, InvalidProjectError } from '../domain/errors/cost-allocation.errors';

const workspaceId = WorkspaceId.create();

describe('cost-allocation domain invariants', () => {
  it('normalizes entity codes and rejects invalid updates without mutating other fields', () => {
    const department = Department.create({ workspaceId, name: 'Engineering', code: ' eng ' });
    const center = CostCenter.create({ workspaceId, name: 'Operations', code: ' ops ' });
    const project = Project.create({ workspaceId, name: 'Launch', code: ' launch ', startDate: new Date('2026-01-01') });
    expect([department.code, center.code, project.code]).toEqual(['ENG', 'OPS', 'LAUNCH']);

    expect(() => department.updateDetails({ name: 'Changed', code: 'bad code' })).toThrow(InvalidCodeError);
    expect(department.name).toBe('Engineering');
    expect(() => center.updateDetails({ code: 'bad code' })).toThrow(InvalidCodeError);
    expect(() => project.updateDetails({ code: 'bad code' })).toThrow(InvalidCodeError);
  });

  it('rejects a department as its own parent', () => {
    const department = Department.create({ workspaceId, name: 'Engineering', code: 'ENG' });
    expect(() => department.updateDetails({ parentDepartmentId: DepartmentId.fromString(department.id.getValue()) }))
      .toThrow(InvalidDepartmentHierarchyError);
  });

  it('rejects invalid project dates and budgets on creation and update', () => {
    const startDate = new Date('2026-02-01');
    expect(() => Project.create({ workspaceId, name: 'Bad', code: 'BAD', startDate, endDate: new Date('2026-01-01') }))
      .toThrow(InvalidProjectError);
    expect(() => Project.create({ workspaceId, name: 'Bad', code: 'BAD', startDate, budget: -1 }))
      .toThrow(InvalidProjectError);

    const project = Project.create({ workspaceId, name: 'Good', code: 'GOOD', startDate });
    expect(() => project.updateDetails({ endDate: new Date('2026-01-01') })).toThrow(InvalidProjectError);
    expect(() => project.updateDetails({ budget: 0.001 })).toThrow(InvalidProjectError);
    expect(project.endDate).toBeNull();
    const returnedDate = project.startDate;
    returnedDate.setFullYear(2030);
    expect(project.startDate.getFullYear()).toBe(2026);
  });

  it('accepts only amounts representable by Decimal(12,2)', () => {
    expect(AllocationAmount.create('0.01').getValue().toString()).toBe('0.01');
    for (const amount of ['0.001', '10000000000', '0', '-1', 'NaN']) {
      expect(() => AllocationAmount.create(amount)).toThrow(InvalidAllocationAmountError);
    }
  });

  it('validates normalized code length in every target type', () => {
    for (const code of [DepartmentCode, CostCenterCode, ProjectCode]) {
      expect(() => code.create(' a ')).toThrow(InvalidCodeError);
      expect(() => code.create(' ')).toThrow(InvalidCodeError);
      expect(code.create(' ab ').value).toBe('AB');
    }
  });

  it('turns malformed decimal input into a domain error', () => {
    expect(() => AllocationAmount.create('not-a-number')).toThrow(InvalidAllocationAmountError);
  });

  it('rejects blank names and normalizes valid names in all management entities', () => {
    expect(() => Department.create({ workspaceId, name: '  ', code: 'ENG' })).toThrow(InvalidAllocationNameError);
    expect(() => CostCenter.create({ workspaceId, name: '  ', code: 'OPS' })).toThrow(InvalidAllocationNameError);
    expect(() => Project.create({ workspaceId, name: '  ', code: 'PRJ', startDate: new Date() }))
      .toThrow(InvalidAllocationNameError);

    const department = Department.create({ workspaceId, name: ' Engineering ', code: 'ENG' });
    const center = CostCenter.create({ workspaceId, name: ' Operations ', code: 'OPS' });
    const project = Project.create({ workspaceId, name: ' Launch ', code: 'PRJ', startDate: new Date() });
    for (const entity of [department, center, project]) {
      expect(entity.name).toBe(entity.name.trim());
      expect(() => entity.updateDetails({ name: '  ' })).toThrow(InvalidAllocationNameError);
      entity.updateDetails({ name: ' Revised ' });
      expect(entity.name).toBe('Revised');
    }
  });

  it('keeps timestamps private and makes empty updates and repeated deactivation inert', () => {
    const entities = [
      Department.create({ workspaceId, name: 'Engineering', code: 'ENG' }),
      CostCenter.create({ workspaceId, name: 'Operations', code: 'OPS' }),
      Project.create({ workspaceId, name: 'Launch', code: 'PRJ', startDate: new Date() }),
    ];
    for (const entity of entities) {
      entity.clearDomainEvents();
      const createdAt = entity.createdAt.getTime();
      const updatedAt = entity.updatedAt.getTime();
      entity.createdAt.setFullYear(2000);
      entity.updatedAt.setFullYear(2000);
      expect(entity.createdAt.getTime()).toBe(createdAt);
      expect(entity.updatedAt.getTime()).toBe(updatedAt);
      entity.updateDetails({});
      expect(entity.updatedAt.getTime()).toBe(updatedAt);
      expect(entity.domainEvents).toHaveLength(0);
      entity.deactivate();
      entity.deactivate();
      expect(entity.domainEvents.map((event) => event.eventType)).toEqual([`${entity.constructor.name}Deactivated`]);
    }
  });
});
