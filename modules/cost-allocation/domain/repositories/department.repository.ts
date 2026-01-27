import { Department } from "../entities/department.entity";
import { DepartmentId } from "../value-objects/department-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";

export interface DepartmentRepository {
  save(department: Department): Promise<void>;
  findById(id: DepartmentId): Promise<Department | null>;
  findByCode(
    code: string,
    workspaceId: WorkspaceId,
  ): Promise<Department | null>;
  findAll(workspaceId: WorkspaceId): Promise<Department[]>;
  delete(id: DepartmentId, workspaceId: WorkspaceId): Promise<void>;
}
