import { Project } from "../entities/project.entity";
import { ProjectId } from "../value-objects/project-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";

export interface ProjectRepository {
  save(project: Project): Promise<void>;
  findById(id: ProjectId): Promise<Project | null>;
  findByCode(code: string, workspaceId: WorkspaceId): Promise<Project | null>;
  findAll(workspaceId: WorkspaceId): Promise<Project[]>;
  delete(id: ProjectId, workspaceId: WorkspaceId): Promise<void>;
}
