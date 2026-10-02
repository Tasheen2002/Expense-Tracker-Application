import { Department } from "../entities/department.entity";
import { DepartmentId } from "../value-objects/department-id";
import {  WorkspaceId  } from '@core/domain/value-objects';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface IDepartmentRepository {
  save(department: Department): Promise<void>;
  /** Includes inactive departments so they can be reactivated. */
  findById(id: DepartmentId, workspaceId: WorkspaceId): Promise<Department | null>;
  /** Codes remain reserved while a department is inactive. */
  findByCode(
    code: string,
    workspaceId: WorkspaceId,
  ): Promise<Department | null>;
  /** Includes active and inactive departments in a deterministic order. */
  findAll(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Department>>;
}
