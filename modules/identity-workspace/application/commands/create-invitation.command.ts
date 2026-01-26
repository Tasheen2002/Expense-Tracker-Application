import { WorkspaceInvitationService } from '../services/workspace-invitation.service'
import { WorkspaceRole } from '../../domain/entities/workspace-membership.entity'

export interface CreateInvitationCommand {
  workspaceId: string
  email: string
  role: WorkspaceRole
  invitedBy: string
  expiryHours?: number
}

export interface CreateInvitationResult {
  success: boolean
  data?: {
    invitationId: string
    token: string
    email: string
    expiresAt: Date
  }
  error?: string
}

export class CreateInvitationHandler {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(command: CreateInvitationCommand): Promise<CreateInvitationResult> {
    try {
      const invitation = await this.invitationService.createInvitation({
        workspaceId: command.workspaceId,
        email: command.email,
        role: command.role,
        expiryHours: command.expiryHours ?? 168, // Default: 168 hours (7 days)
      })

      return {
        success: true,
        data: {
          invitationId: invitation.getId().getValue(),
          token: invitation.getToken(),
          email: invitation.getEmail(),
          expiresAt: invitation.getExpiresAt(),
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create invitation',
      }
    }
  }
}
