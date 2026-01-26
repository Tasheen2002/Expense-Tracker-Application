import { WorkspaceInvitationService } from '../services/workspace-invitation.service'

export interface AcceptInvitationCommand {
  token: string
  userId: string
}

export interface AcceptInvitationResult {
  success: boolean
  data?: {
    membershipId: string
    workspaceId: string
    userId: string
    role: string
  }
  error?: string
}

export class AcceptInvitationHandler {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(command: AcceptInvitationCommand): Promise<AcceptInvitationResult> {
    try {
      const membership = await this.invitationService.acceptInvitation(
        command.token,
        command.userId
      )

      return {
        success: true,
        data: {
          membershipId: membership.getId().getValue(),
          workspaceId: membership.getWorkspaceId().getValue(),
          userId: membership.getUserId().getValue(),
          role: membership.getRole(),
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to accept invitation',
      }
    }
  }
}
