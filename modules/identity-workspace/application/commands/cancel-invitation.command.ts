import { WorkspaceInvitationService } from '../services/workspace-invitation.service'

export interface CancelInvitationCommand {
  invitationId: string
}

export interface CancelInvitationResult {
  success: boolean
  error?: string
}

export class CancelInvitationHandler {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(command: CancelInvitationCommand): Promise<CancelInvitationResult> {
    try {
      await this.invitationService.cancelInvitation(command.invitationId)

      return {
        success: true,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel invitation',
      }
    }
  }
}
