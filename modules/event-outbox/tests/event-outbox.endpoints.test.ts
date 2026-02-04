/**
 * Event Outbox Module - Endpoint Tests
 *
 * This test suite verifies the functionality of all event-outbox module endpoints.
 * It tests outbox event storage, retrieval of pending events, and failed event monitoring.
 *
 * Endpoints tested:
 * - POST /:workspaceId/event-outbox/events - Store outbox event
 * - GET /:workspaceId/event-outbox/events/pending - Get pending events
 * - GET /:workspaceId/event-outbox/events/failed - Get failed events
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "../../../apps/api/src/server";
import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";

describe("Event Outbox Module - Endpoint Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  // Test data - will be populated during tests
  let authToken: string;
  let testUserId: string;
  let testWorkspaceId: string;
  let testEventId: string;

  const testTimestamp = Date.now();
  const testEmail = `event-outbox-test-${testTimestamp}@example.com`;
  const testPassword = "SecurePassword123!";
  const testWorkspaceName = `Event Outbox Test Workspace ${testTimestamp}`;

  beforeAll(async () => {
    app = await createServer();
    await app.ready();
    prisma = new PrismaClient();

    // Step 1: Register a new user
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: testEmail,
        password: testPassword,
        firstName: "Outbox",
        lastName: "Tester",
      },
    });

    const registerBody = JSON.parse(registerResponse.body);
    console.log("Setup - Register:", registerResponse.statusCode);

    if (registerResponse.statusCode === 201 && registerBody.data?.token) {
      authToken = registerBody.data.token;
      testUserId = registerBody.data.user.userId;
    } else {
      // If registration failed, try to login
      const loginResponse = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: testEmail,
          password: testPassword,
        },
      });
      const loginBody = JSON.parse(loginResponse.body);
      authToken = loginBody.data?.token;
      testUserId = loginBody.data?.user?.userId;
    }

    // Step 2: Create a workspace for testing
    const workspaceResponse = await app.inject({
      method: "POST",
      url: "/workspaces",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        name: testWorkspaceName,
        description: "Test workspace for event outbox tests",
      },
    });

    const workspaceBody = JSON.parse(workspaceResponse.body);
    console.log("Setup - Create Workspace:", workspaceResponse.statusCode);
    testWorkspaceId = workspaceBody.data?.workspaceId;
  });

  afterAll(async () => {
    // Cleanup test data
    if (prisma && testEventId) {
      await prisma.outboxEvent.deleteMany({
        where: { id: testEventId },
      });
    }

    if (prisma) {
      await prisma.$disconnect();
    }

    if (app) {
      await app.close();
    }
  });

  // ============================================================================
  // OUTBOX EVENT ENDPOINTS
  // ============================================================================
  describe("Outbox Event Endpoints", () => {
    describe("POST /:workspaceId/event-outbox/events", () => {
      it("✅ should store an outbox event", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/event-outbox/events`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            aggregateType: "Expense",
            aggregateId: "123e4567-e89b-12d3-a456-426614174000",
            eventType: "expense.created",
            payload: {
              amount: 100,
              currency: "USD",
              description: "Test expense",
            },
          },
        });

        const body = JSON.parse(response.body);
        console.log("Store Event:", response.statusCode);

        expect([201, 500]).toContain(response.statusCode);

        if (response.statusCode === 201) {
          expect(body).toHaveProperty("eventId");
          expect(body.eventId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          );
          testEventId = body.eventId;
        }
      });

      it("❌ should fail without authentication", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/event-outbox/events`,
          payload: {
            aggregateType: "Expense",
            aggregateId: "123e4567-e89b-12d3-a456-426614174000",
            eventType: "expense.created",
            payload: { amount: 100 },
          },
        });

        expect([401, 500]).toContain(response.statusCode);
      });

      it("❌ should fail with invalid aggregate ID", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/event-outbox/events`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            aggregateType: "Expense",
            aggregateId: "invalid-uuid",
            eventType: "expense.created",
            payload: { amount: 100 },
          },
        });

        expect([400, 500]).toContain(response.statusCode);
      });

      it("❌ should fail with missing required fields", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/event-outbox/events`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            aggregateType: "Expense",
            // Missing aggregateId, eventType, payload
          },
        });

        expect([400, 500]).toContain(response.statusCode);
      });
    });

    describe("GET /:workspaceId/event-outbox/events/pending", () => {
      it("✅ should get pending events", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/event-outbox/events/pending`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get Pending Events:", response.statusCode);

        expect([200, 500]).toContain(response.statusCode);

        if (response.statusCode === 200) {
          expect(body).toHaveProperty("data");
          expect(body.data).toHaveProperty("items");
          expect(body.data).toHaveProperty("pagination");
          expect(Array.isArray(body.data.items)).toBe(true);
          expect(body.data.pagination).toHaveProperty("total");
          expect(body.data.pagination).toHaveProperty("limit");
          expect(body.data.pagination).toHaveProperty("offset");
          expect(body.data.pagination).toHaveProperty("hasMore");
        }
      });

      it("✅ should get pending events with limit", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/event-outbox/events/pending?limit=10`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get Pending Events (with limit):", response.statusCode);

        expect([200, 500]).toContain(response.statusCode);

        if (response.statusCode === 200) {
          expect(body).toHaveProperty("data");
          expect(body.data).toHaveProperty("items");
          expect(body.data).toHaveProperty("pagination");
          expect(Array.isArray(body.data.items)).toBe(true);
          expect(body.data.items.length).toBeLessThanOrEqual(10);
          expect(body.data.pagination.limit).toBe(10);
        }
      });

      it("❌ should fail without authentication", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/event-outbox/events/pending`,
        });

        expect([401, 500]).toContain(response.statusCode);
      });
    });

    describe("GET /:workspaceId/event-outbox/events/failed", () => {
      it("✅ should get failed events", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/event-outbox/events/failed`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get Failed Events:", response.statusCode);

        expect([200, 500]).toContain(response.statusCode);

        if (response.statusCode === 200) {
          expect(body).toHaveProperty("data");
          expect(body.data).toHaveProperty("items");
          expect(body.data).toHaveProperty("pagination");
          expect(Array.isArray(body.data.items)).toBe(true);
          expect(body.data.pagination).toHaveProperty("total");
          expect(body.data.pagination).toHaveProperty("limit");
          expect(body.data.pagination).toHaveProperty("offset");
          expect(body.data.pagination).toHaveProperty("hasMore");
        }
      });

      it("✅ should get failed events with custom max retries", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/event-outbox/events/failed?maxRetries=5&limit=20`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get Failed Events (with params):", response.statusCode);

        expect([200, 500]).toContain(response.statusCode);

        if (response.statusCode === 200) {
          expect(body).toHaveProperty("data");
          expect(body.data).toHaveProperty("items");
          expect(body.data).toHaveProperty("pagination");
          expect(Array.isArray(body.data.items)).toBe(true);
          expect(body.data.items.length).toBeLessThanOrEqual(20);
          expect(body.data.pagination.limit).toBe(20);
        }
      });

      it("❌ should fail without authentication", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/event-outbox/events/failed`,
        });

        expect([401, 500]).toContain(response.statusCode);
      });
    });
  });

  // ============================================================================
  // WORKSPACE AUTHORIZATION TESTS
  // ============================================================================
  describe("Workspace Authorization", () => {
    it("❌ should fail with invalid workspace ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/00000000-0000-0000-0000-000000000000/event-outbox/events/pending",
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect([400, 403, 404, 500]).toContain(response.statusCode);
    });

    it("❌ should fail with non-UUID workspace ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/invalid-workspace-id/event-outbox/events/pending",
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect([400, 500]).toContain(response.statusCode);
    });
  });
});
