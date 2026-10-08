import { describe, expect, it } from 'vitest';
import { WorkspaceId } from '@core/domain/value-objects';
import { Department } from '../domain/entities/department.entity';
import { CostCenter } from '../domain/entities/cost-center.entity';
import { Project } from '../domain/entities/project.entity';

describe('management lifecycle event workspace ownership', () => {
  const workspaceId = WorkspaceId.create();
  const cases = [
    ['Department', () => Department.create({ workspaceId, name: 'Engineering', code: 'ENG' })],
    ['CostCenter', () => CostCenter.create({ workspaceId, name: 'Operations', code: 'OPS' })],
    ['Project', () => Project.create({ workspaceId, name: 'Launch', code: 'PRJ', startDate: new Date() })],
  ] as const;

  it.each(cases)('%s emits an audit-ready workspace on every lifecycle event', (type, create) => {
    const entity = create();
    entity.updateDetails({ name: 'Updated name' });
    entity.deactivate();
    entity.activate();
    expect(entity.domainEvents.map(event => event.eventType)).toEqual([
      `${type}Created`, `${type}Updated`, `${type}Deactivated`, `${type}Activated`,
    ]);
    for (const event of entity.domainEvents) {
      expect(event.aggregateId).toBe(entity.id.getValue());
      expect(event.getPayload().workspaceId).toBe(workspaceId.getValue());
    }
  });
});
