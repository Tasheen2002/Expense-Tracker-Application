import { Department } from "../entities/department.entity";
import { DepartmentId } from "../value-objects/department-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface DepartmentRepository {
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
