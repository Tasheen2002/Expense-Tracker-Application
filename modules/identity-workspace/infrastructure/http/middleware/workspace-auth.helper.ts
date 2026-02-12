import { FastifyReply, FastifyRequest } from 'fastify'
import { WorkspaceMembershipService } from '../../../application/services/workspace-membership.service'
import { WorkspaceRole } from '../../../domain/entities/workspace-membership.entity'

export class WorkspaceAuthHelper {
  constructor(private readonly membershipService: WorkspaceMembershipService) {}

  /**
   * Check if user is a member of the workspace
   */
  async verifyMembership(
    userId: string,
    workspaceId: string,
    reply: FastifyReply
  ): Promise<boolean> {
    const isMember = await this.membershipService.isMember(userId, workspaceId)

    if (!isMember) {
      reply.status(403).send({
        success: false,
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have access to this workspace',
      })
      return false
    }

    return true
  }

  /**
   * Check if user can edit the workspace (owner or admin)
   */
  async verifyCanEdit(
    userId: string,
    workspaceId: string,
    reply: FastifyReply
  ): Promise<boolean> {
    const canEdit = await this.membershipService.canEditWorkspace(userId, workspaceId)

    if (!canEdit) {
      reply.status(403).send({
        success: false,
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to edit this workspace',
      })
      return false
    }

    return true
  }

  /**
   * Check if user can delete the workspace (owner only)
   */
  async verifyCanDelete(
    userId: string,
    workspaceId: string,
    reply: FastifyReply
  ): Promise<boolean> {
    const canDelete = await this.membershipService.canDeleteWorkspace(userId, workspaceId)

    if (!canDelete) {
      reply.status(403).send({
        success: false,
        statusCode: 403,
        error: 'Forbidden',
        message: 'Only workspace owner can delete the workspace',
      })
      return false
    }

    return true
  }

  /**
   * Check if user can manage members (owner or admin)
   */
  async verifyCanManageMembers(
    userId: string,
    workspaceId: string,
    reply: FastifyReply
  ): Promise<boolean> {
    const canManage = await this.membershipService.canManageMembers(userId, workspaceId)

    if (!canManage) {
      reply.status(403).send({
        success: false,
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to manage workspace members',
      })
      return false
    }

    return true
  }

  /**
   * Get user info from request
   */
  getUserFromRequest(request: FastifyRequest): { userId: string } | null {
    const user = request.user as { userId?: string } | undefined
    if (!user || !user.userId) {
      return null
    }
    return { userId: user.userId }
  }
}
