import { PaginationOptions } from '@core/domain/interfaces/paginated-result.interface';
import { InvalidManagementSortError } from '../../domain/errors/cost-allocation.errors';

const commonFields = ['id', 'name', 'code', 'isActive', 'createdAt', 'updatedAt'] as const;
const projectFields = [...commonFields, 'startDate', 'endDate', 'budget'] as const;

export function managementOrderBy(
  options: PaginationOptions | undefined,
  kind: 'department' | 'costCenter' | 'project',
): Record<string, 'asc' | 'desc'>[] {
  const field = options?.sortBy ?? 'createdAt';
  const allowed: readonly string[] = kind === 'project' ? projectFields : commonFields;
  if (!allowed.includes(field)) {
    throw new InvalidManagementSortError(field);
  }

  const direction = options?.sortOrder ?? 'desc';
  if (direction !== 'asc' && direction !== 'desc') {
    throw new InvalidManagementSortError(`sortOrder=${String(direction)}`);
  }

  const primary = { [field]: direction };
  return field === 'id' ? [primary] : [primary, { id: 'asc' }];
}
