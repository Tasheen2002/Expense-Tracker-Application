import { WorkspaceInvitationService } from "../services/workspace-invitation.service";
import { WorkspaceInvitation } from "../../domain/entities/workspace-invitation.entity";

export interface GetInvitationByTokenQuery {
  token: string;
}

export interface GetWorkspaceInvitationsQuery {
  workspaceId: string;
}

export interface GetPendingInvitationsQuery {
  workspaceId: string;
}

export interface GetUserInvitationsQuery {
  email: string;
}

export class GetInvitationByTokenHandler {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    query: GetInvitationByTokenQuery,
  ): Promise<WorkspaceInvitation | null> {
    return await this.invitationService.getInvitationByToken(query.token);
  }
}

export class GetWorkspaceInvitationsHandler {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    query: GetWorkspaceInvitationsQuery,
  ): Promise<WorkspaceInvitation[]> {
    return await this.invitationService.getWorkspaceInvitations(
      query.workspaceId,
    );
  }
}

export class GetPendingInvitationsHandler {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    query: GetPendingInvitationsQuery,
  ): Promise<WorkspaceInvitation[]> {
    return await this.invitationService.getPendingInvitations(
      query.workspaceId,
    );
  }
}

export class GetUserInvitationsHandler {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(query: GetUserInvitationsQuery): Promise<WorkspaceInvitation[]> {
    return await this.invitationService.getUserInvitations(query.email);
  }
}
