import { WorkspaceManagementService } from "../services/workspace-management.service";
import { Workspace } from "../../domain/entities/workspace.entity";

export interface GetWorkspaceByIdQuery {
  workspaceId: string;
}

export interface GetUserWorkspacesQuery {
  userId: string;
}

export class GetWorkspaceByIdHandler {
  constructor(
    private readonly workspaceManagementService: WorkspaceManagementService,
  ) {}

  async handle(query: GetWorkspaceByIdQuery): Promise<Workspace | null> {
    return await this.workspaceManagementService.getWorkspaceById(
      query.workspaceId,
    );
  }
}

export class GetUserWorkspacesHandler {
  constructor(
    private readonly workspaceManagementService: WorkspaceManagementService,
  ) {}

  async handle(query: GetUserWorkspacesQuery): Promise<Workspace[]> {
    // FIXED: Get ALL workspaces user is a member of, not just owned workspaces
    return await this.workspaceManagementService.getWorkspacesByMembership(
      query.userId,
    );
  }
}
