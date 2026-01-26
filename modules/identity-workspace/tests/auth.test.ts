import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from '../../../apps/api/src/server'
import { FastifyInstance } from 'fastify'

describe('Identity-Workspace Module - Authentication', () => {
  let server: FastifyInstance
  let authToken: string
  let userId: string

  beforeAll(async () => {
    server = await createServer()
  })

  afterAll(async () => {
    // Clean up test data
    await (server as any).prisma.$executeRawUnsafe(
      `DELETE FROM identity_workspace.user_account WHERE email = 'testuser@example.com'`
    )
    await server.close()
  })

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'testuser@example.com',
          password: 'password123',
          fullName: 'Test User',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toHaveProperty('userId')
      expect(body.data).toHaveProperty('email', 'testuser@example.com')
      expect(body.data).toHaveProperty('fullName', 'Test User')
      expect(body.data).toHaveProperty('emailVerified', false)
      expect(body.message).toBe('User registered successfully')

      userId = body.data.userId
    })

    it('should fail to register user with duplicate email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'testuser@example.com',
          password: 'password123',
          fullName: 'Test User Duplicate',
        },
      })

      expect(response.statusCode).toBe(409)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Conflict')
      expect(body.message).toContain('already exists')
    })

    it('should fail to register user without email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          password: 'password123',
          fullName: 'Test User',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
    })

    it('should fail to register user with short password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'shortpass@example.com',
          password: 'short',
          fullName: 'Test User',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toContain('8 characters')
    })

    it('should fail to register user with invalid email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'password123',
          fullName: 'Test User',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
    })
  })

  describe('POST /auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'testuser@example.com',
          password: 'password123',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toHaveProperty('user')
      expect(body.data).toHaveProperty('token')
      expect(body.data.user).toHaveProperty('userId', userId)
      expect(body.data.user).toHaveProperty('email', 'testuser@example.com')
      expect(body.message).toBe('Login successful')

      authToken = body.data.token
    })

    it('should fail to login with incorrect password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'testuser@example.com',
          password: 'wrongpassword',
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Unauthorized')
    })

    it('should fail to login with non-existent email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
    })

    it('should fail to login without email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          password: 'password123',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
    })

    it('should fail to login without password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'testuser@example.com',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
    })
  })

  describe('GET /auth/me', () => {
    it('should get current user with valid token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toHaveProperty('userId', userId)
      expect(body.data).toHaveProperty('email', 'testuser@example.com')
    })

    it('should fail to get current user without token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
    })

    it('should fail to get current user with invalid token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
    })

    it('should fail to get current user with malformed authorization header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: authToken, // Missing 'Bearer ' prefix
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
    })
  })

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('status', 'ok')
      expect(body).toHaveProperty('uptime')
      expect(typeof body.uptime).toBe('number')
    })
  })
})
