import { FastifyInstance } from 'fastify'
import { InvitationController } from '../controllers/invitation.controller'

const createInvitationSchema = {
  schema: {
    tags: ['Invitation'],
    description: 'Create invitation for workspace',
    params: {
      type: 'object',
      required: ['workspaceId'],
      properties: {
        workspaceId: { type: 'string', format: 'uuid' },
      },
    },
    body: {
      type: 'object',
      required: ['email', 'role'],
      properties: {
        email: { type: 'string', format: 'email' },
        role: { type: 'string', enum: ['owner', 'admin', 'member'] },
        expiryHours: { type: 'number', minimum: 1, maximum: 720 },
      },
    },
    response: {
      201: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          statusCode: { type: 'number' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              invitationId: { type: 'string' },
              token: { type: 'string' },
              email: { type: 'string' },
              expiresAt: { type: 'string' },
            },
          },
        },
      },
    },
  },
}

const getInvitationByTokenSchema = {
  schema: {
    tags: ['Invitation'],
    description: 'Get invitation details by token',
    params: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          statusCode: { type: 'number' },
          data: {
            type: 'object',
            properties: {
              invitationId: { type: 'string' },
              workspaceId: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' },
              expiresAt: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
  },
}

const acceptInvitationSchema = {
  schema: {
    tags: ['Invitation'],
    description: 'Accept workspace invitation',
    params: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          statusCode: { type: 'number' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              membershipId: { type: 'string' },
              workspaceId: { type: 'string' },
              userId: { type: 'string' },
              role: { type: 'string' },
            },
          },
        },
      },
    },
  },
}

const listInvitationsSchema = {
  schema: {
    tags: ['Invitation'],
    description: 'List workspace pending invitations',
    params: {
      type: 'object',
      required: ['workspaceId'],
      properties: {
        workspaceId: { type: 'string', format: 'uuid' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          statusCode: { type: 'number' },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                invitationId: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                expiresAt: { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
}

const cancelInvitationSchema = {
  schema: {
    tags: ['Invitation'],
    description: 'Cancel workspace invitation',
    params: {
      type: 'object',
      required: ['workspaceId', 'invitationId'],
      properties: {
        workspaceId: { type: 'string', format: 'uuid' },
        invitationId: { type: 'string', format: 'uuid' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          statusCode: { type: 'number' },
          message: { type: 'string' },
        },
      },
    },
  },
}

export async function registerInvitationRoutes(
  fastify: FastifyInstance,
  controller: InvitationController
) {
  // Create invitation for a workspace
  fastify.post(
    '/workspaces/:workspaceId/invitations',
    {
      ...createInvitationSchema,
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => controller.createInvitation(request, reply)
  )

  // Get invitation by token (public - no auth required)
  fastify.get(
    '/invitations/:token',
    getInvitationByTokenSchema,
    async (request, reply) => controller.getInvitationByToken(request, reply)
  )

  // Accept invitation
  fastify.post(
    '/invitations/:token/accept',
    {
      ...acceptInvitationSchema,
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => controller.acceptInvitation(request, reply)
  )

  // List workspace invitations
  fastify.get(
    '/workspaces/:workspaceId/invitations',
    {
      ...listInvitationsSchema,
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => controller.listWorkspaceInvitations(request, reply)
  )

  // Cancel invitation
  fastify.delete(
    '/workspaces/:workspaceId/invitations/:invitationId',
    {
      ...cancelInvitationSchema,
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => controller.cancelInvitation(request, reply)
  )
}
