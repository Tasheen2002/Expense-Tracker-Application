import { Department } from "../entities/department.entity";
import { DepartmentId } from "../value-objects/department-id";
import { WorkspaceId } from "../../../identity-workspace";
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface IDepartmentRepository {
  save(department: Department): Promise<void>;
  findById(id: DepartmentId): Promise<Department | null>;
  findByCode(
    code: string,
    workspaceId: WorkspaceId,
  ): Promise<Department | null>;
  findAll(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Department>>;
  delete(id: DepartmentId, workspaceId: WorkspaceId): Promise<void>;
}
