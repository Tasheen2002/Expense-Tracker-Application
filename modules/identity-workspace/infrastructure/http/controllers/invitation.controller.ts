import { FastifyRequest, FastifyReply } from 'fastify'
import { CreateInvitationHandler } from '../../../application/commands/create-invitation.command'
import { AcceptInvitationHandler } from '../../../application/commands/accept-invitation.command'
import { CancelInvitationHandler } from '../../../application/commands/cancel-invitation.command'
import {
  GetInvitationByTokenHandler,
  GetWorkspaceInvitationsHandler,
  GetPendingInvitationsHandler,
} from '../../../application/queries/get-invitation.query'
import { WorkspaceAuthHelper } from '../middleware/workspace-auth.helper'
import { WorkspaceRole } from '../../../domain/entities/workspace-membership.entity'
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";

export class InvitationController {
  constructor(
    private readonly createInvitationHandler: CreateInvitationHandler,
    private readonly acceptInvitationHandler: AcceptInvitationHandler,
    private readonly cancelInvitationHandler: CancelInvitationHandler,
    private readonly getInvitationByTokenHandler: GetInvitationByTokenHandler,
    private readonly getWorkspaceInvitationsHandler: GetWorkspaceInvitationsHandler,
    private readonly getPendingInvitationsHandler: GetPendingInvitationsHandler,
    private readonly authHelper: WorkspaceAuthHelper
  ) {}

  async createInvitation(request: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = request.params as { workspaceId: string }
    const { email, role, expiryHours } = request.body as {
      email: string
      role: WorkspaceRole
      expiryHours?: number
    }
    const user = this.authHelper.getUserFromRequest(request)

    if (!user) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        error: 'Unauthorized',
        message: 'User not authenticated',
      })
    }

    // Check if user can manage members (owner or admin)
    const canManage = await this.authHelper.verifyCanManageMembers(user.userId, workspaceId, reply)
    if (!canManage) {
      return // Response already sent by helper
    }

    const result = await this.createInvitationHandler.handle({
      workspaceId,
      email,
      role,
      invitedBy: user.userId,
      expiryHours,
    })

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        error: 'Bad Request',
        message: result.error || 'Failed to create invitation',
      })
    }

    return reply.status(201).send({
      success: true,
      statusCode: 201,
      message: 'Invitation created successfully',
      data: result.data,
    })
  }

  async getInvitationByToken(request: FastifyRequest, reply: FastifyReply) {
    const { token } = request.params as { token: string }

    const invitation = await this.getInvitationByTokenHandler.handle({ token })

    if (!invitation) {
      return reply.status(404).send({
        success: false,
        statusCode: 404,
        error: 'Not Found',
        message: 'Invitation not found',
      })
    }

    if (invitation.isExpired()) {
      return reply.status(410).send({
        success: false,
        statusCode: 410,
        error: 'Gone',
        message: 'Invitation has expired',
      })
    }

    if (invitation.isAccepted()) {
      return reply.status(410).send({
        success: false,
        statusCode: 410,
        error: 'Gone',
        message: 'Invitation has already been accepted',
      })
    }

    return reply.status(200).send({
      success: true,
      statusCode: 200,
      data: {
        invitationId: invitation.getId().getValue(),
        workspaceId: invitation.getWorkspaceId().getValue(),
        email: invitation.getEmail(),
        role: invitation.getRole(),
        expiresAt: invitation.getExpiresAt(),
        createdAt: invitation.getCreatedAt(),
      },
    })
  }

  async acceptInvitation(request: FastifyRequest, reply: FastifyReply) {
    const { token } = request.params as { token: string }
    const user = this.authHelper.getUserFromRequest(request)

    if (!user) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        error: 'Unauthorized',
        message: 'User not authenticated',
      })
    }

    const result = await this.acceptInvitationHandler.handle({
      token,
      userId: user.userId,
    })

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        error: 'Bad Request',
        message: result.error || 'Failed to accept invitation',
      })
    }

    return reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Invitation accepted successfully',
      data: result.data,
    })
  }

  async listWorkspaceInvitations(request: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = request.params as { workspaceId: string }
    const user = this.authHelper.getUserFromRequest(request)

    if (!user) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        error: 'Unauthorized',
        message: 'User not authenticated',
      })
    }

    // Check if user can manage members (owner or admin)
    const canManage = await this.authHelper.verifyCanManageMembers(user.userId, workspaceId, reply)
    if (!canManage) {
      return // Response already sent by helper
    }

    const invitations = await this.getPendingInvitationsHandler.handle({ workspaceId })

    return reply.status(200).send({
      success: true,
      statusCode: 200,
      data: invitations.map((inv) => ({
        invitationId: inv.getId().getValue(),
        email: inv.getEmail(),
        role: inv.getRole(),
        expiresAt: inv.getExpiresAt(),
        createdAt: inv.getCreatedAt(),
      })),
    })
  }

  async cancelInvitation(request: FastifyRequest, reply: FastifyReply) {
    const { workspaceId, invitationId } = request.params as {
      workspaceId: string
      invitationId: string
    }
    const user = this.authHelper.getUserFromRequest(request)

    if (!user) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        error: 'Unauthorized',
        message: 'User not authenticated',
      })
    }

    // Check if user can manage members (owner or admin)
    const canManage = await this.authHelper.verifyCanManageMembers(user.userId, workspaceId, reply)
    if (!canManage) {
      return // Response already sent by helper
    }

    const result = await this.cancelInvitationHandler.handle({ invitationId })

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        error: 'Bad Request',
        message: result.error || 'Failed to cancel invitation',
      })
    }

    return reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Invitation cancelled successfully',
    })
  }
}
