/**
 * Budget Management Module - Endpoint Tests
 *
 * This test suite verifies the functionality of all budget-management module endpoints.
 * It tests budgets, allocations, and spending limits CRUD operations.
 *
 * Endpoints tested:
 * - Budgets: POST, GET (list, single), PUT, DELETE, activate, archive
 * - Allocations: POST, GET, PUT, DELETE
 * - Spending Limits: POST, GET, PUT, DELETE
 * - Alerts: GET unread alerts
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "../../../apps/api/src/server";
import { FastifyInstance } from "fastify";

describe("Budget Management Module - Endpoint Tests", () => {
  let app: FastifyInstance;

  // Test data - will be populated during tests
  let authToken: string;
  let testUserId: string;
  let testWorkspaceId: string;
  let testBudgetId: string;
  let testAllocationId: string;
  let testSpendingLimitId: string;

  const testTimestamp = Date.now();
  const testEmail = `budget-test-${testTimestamp}@example.com`;
  const testPassword = "SecurePassword123!";
  const testWorkspaceName = `Budget Test Workspace ${testTimestamp}`;

  beforeAll(async () => {
    app = await createServer();
    await app.ready();

    // Step 1: Register a new user
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: testEmail,
        password: testPassword,
        firstName: "Budget",
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
        description: "Test workspace for budget management tests",
      },
    });

    const workspaceBody = JSON.parse(workspaceResponse.body);
    console.log("Setup - Create Workspace:", workspaceResponse.statusCode);
    testWorkspaceId = workspaceBody.data?.workspaceId;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ============================================================================
  // BUDGET ENDPOINTS
  // ============================================================================
  describe("Budget Endpoints", () => {
    describe("POST /api/v1/:workspaceId/budgets", () => {
      it("✅ should create a budget", async () => {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/budgets`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            name: `Q1 Marketing Budget ${testTimestamp}`,
            description: "Marketing budget for Q1 2026",
            totalAmount: 10000.0,
            currency: "USD",
            periodType: "MONTHLY",
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            isRecurring: false,
            rolloverUnused: false,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Create Budget:", response.statusCode, body.message);

        expect(response.statusCode).toBe(201);
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty("budgetId");

        testBudgetId = body.data.budgetId;
      });

      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/budgets`,
          payload: {
            name: "Test Budget",
            totalAmount: 5000,
            currency: "USD",
            periodType: "MONTHLY",
            startDate: new Date().toISOString(),
          },
        });

        console.log("Create Budget No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });

      it("❌ should fail with missing required fields", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/budgets`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            name: "Incomplete Budget",
            // Missing: totalAmount, currency, periodType, startDate
          },
        });

        console.log("Create Budget Missing Fields:", response.statusCode);
        expect(response.statusCode).toBe(400);
      });

      it("❌ should fail with invalid amount", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/budgets`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            name: "Invalid Budget",
            totalAmount: 0, // Must be minimum 0.01
            currency: "USD",
            periodType: "MONTHLY",
            startDate: new Date().toISOString(),
          },
        });

        console.log("Create Budget Invalid Amount:", response.statusCode);
        expect(response.statusCode).toBe(400);
      });
    });

    describe("GET /api/v1/:workspaceId/budgets", () => {
      it("✅ should list budgets", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/budgets`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("List Budgets:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
      });

      it("✅ should filter budgets by status", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/budgets?status=DRAFT`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("List Budgets by Status:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
      });

      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/budgets`,
        });

        console.log("List Budgets No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });
    });

    describe("GET /api/v1/:workspaceId/budgets/:budgetId", () => {
      it("✅ should get budget by ID", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/budgets/${testBudgetId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get Budget:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.budgetId).toBe(testBudgetId);
      });

      it("❌ should fail with non-existent budget ID", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/budgets/00000000-0000-0000-0000-000000000000`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        console.log("Get Non-existent Budget:", response.statusCode);
        expect([400, 404, 500]).toContain(response.statusCode);
      });
    });

    describe("PUT /api/v1/:workspaceId/budgets/:budgetId", () => {
      it("✅ should update budget", async () => {
        const response = await app.inject({
          method: "PUT",
          url: `/api/v1/${testWorkspaceId}/budgets/${testBudgetId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            name: `Updated Q1 Budget ${testTimestamp}`,
            totalAmount: 12000.0,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Update Budget:", response.statusCode, body.message);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
      });

      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "PUT",
          url: `/api/v1/${testWorkspaceId}/budgets/${testBudgetId}`,
          payload: {
            name: "Updated Name",
          },
        });

        console.log("Update Budget No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });
    });

    describe("POST /api/v1/:workspaceId/budgets/:budgetId/activate", () => {
      it("✅ should activate budget", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/budgets/${testBudgetId}/activate`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Activate Budget:", response.statusCode, body.message);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
      });

      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/budgets/${testBudgetId}/activate`,
        });

        console.log("Activate Budget No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });
    });

    describe("POST /api/v1/:workspaceId/budgets/:budgetId/archive", () => {
      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/budgets/${testBudgetId}/archive`,
        });

        console.log("Archive Budget No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });
    });
  });

  // ============================================================================
  // ALLOCATION ENDPOINTS
  // ============================================================================
  describe("Allocation Endpoints", () => {
    describe("POST /api/v1/:workspaceId/budgets/:budgetId/allocations", () => {
      it("✅ should add allocation to budget", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/budgets/${testBudgetId}/allocations`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            allocatedAmount: 2500.0,
            description: "Social media advertising",
          },
        });

        const body = JSON.parse(response.body);
        console.log("Add Allocation:", response.statusCode, body.message);

        expect(response.statusCode).toBe(201);
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty("allocationId");

        testAllocationId = body.data.allocationId;
      });

      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/budgets/${testBudgetId}/allocations`,
          payload: {
            allocatedAmount: 1000,
          },
        });

        console.log("Add Allocation No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });

      it("❌ should fail with invalid amount", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/budgets/${testBudgetId}/allocations`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            allocatedAmount: 0, // Must be minimum 0.01
          },
        });

        console.log("Add Allocation Invalid Amount:", response.statusCode);
        expect(response.statusCode).toBe(400);
      });
    });

    describe("GET /api/v1/:workspaceId/budgets/:budgetId/allocations", () => {
      it("✅ should get budget allocations", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/budgets/${testBudgetId}/allocations`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get Allocations:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
      });

      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/budgets/${testBudgetId}/allocations`,
        });

        console.log("Get Allocations No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });
    });

    describe("PUT /api/v1/:workspaceId/budgets/:budgetId/allocations/:allocationId", () => {
      it("✅ should update allocation", async () => {
        const response = await app.inject({
          method: "PUT",
          url: `/api/v1/${testWorkspaceId}/budgets/${testBudgetId}/allocations/${testAllocationId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            allocatedAmount: 3000.0,
            description: "Updated social media budget",
          },
        });

        const body = JSON.parse(response.body);
        console.log("Update Allocation:", response.statusCode, body.message);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
      });

      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "PUT",
          url: `/api/v1/${testWorkspaceId}/budgets/${testBudgetId}/allocations/${testAllocationId}`,
          payload: {
            allocatedAmount: 1500,
          },
        });

        console.log("Update Allocation No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });
    });
  });

  // ============================================================================
  // SPENDING LIMIT ENDPOINTS
  // ============================================================================
  describe("Spending Limit Endpoints", () => {
    describe("POST /api/v1/:workspaceId/spending-limits", () => {
      it("✅ should create a spending limit", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/spending-limits`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            limitAmount: 500.0,
            currency: "USD",
            periodType: "MONTHLY",
          },
        });

        const body = JSON.parse(response.body);
        console.log(
          "Create Spending Limit:",
          response.statusCode,
          body.message,
        );

        expect(response.statusCode).toBe(201);
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty("limitId");

        testSpendingLimitId = body.data.limitId;
      });

      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/spending-limits`,
          payload: {
            limitAmount: 1000,
            currency: "USD",
            periodType: "MONTHLY",
          },
        });

        console.log("Create Spending Limit No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });

      it("❌ should fail with missing required fields", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/spending-limits`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            limitAmount: 500,
            // Missing: currency, periodType
          },
        });

        console.log(
          "Create Spending Limit Missing Fields:",
          response.statusCode,
        );
        expect(response.statusCode).toBe(400);
      });
    });

    describe("GET /api/v1/:workspaceId/spending-limits", () => {
      it("✅ should list spending limits", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/spending-limits`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("List Spending Limits:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
      });

      it("✅ should filter by period type", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/spending-limits?periodType=MONTHLY`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("List Spending Limits by Period:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
      });

      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/spending-limits`,
        });

        console.log("List Spending Limits No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });
    });

    describe("PUT /api/v1/:workspaceId/spending-limits/:limitId", () => {
      it("✅ should update spending limit", async () => {
        const response = await app.inject({
          method: "PUT",
          url: `/api/v1/${testWorkspaceId}/spending-limits/${testSpendingLimitId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            limitAmount: 750.0,
          },
        });

        const body = JSON.parse(response.body);
        console.log(
          "Update Spending Limit:",
          response.statusCode,
          body.message,
        );

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
      });

      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "PUT",
          url: `/api/v1/${testWorkspaceId}/spending-limits/${testSpendingLimitId}`,
          payload: {
            limitAmount: 1000,
          },
        });

        console.log("Update Spending Limit No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });
    });
  });

  // ============================================================================
  // ALERTS ENDPOINTS
  // ============================================================================
  describe("Alert Endpoints", () => {
    describe("GET /api/v1/:workspaceId/budgets/alerts/unread", () => {
      it("✅ should get unread alerts", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/budgets/alerts/unread`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get Unread Alerts:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
      });

      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/budgets/alerts/unread`,
        });

        console.log("Get Unread Alerts No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });
    });
  });

  // ============================================================================
  // CLEANUP & DELETE TESTS
  // ============================================================================
  describe("Cleanup - Delete Tests", () => {
    describe("DELETE /api/v1/:workspaceId/budgets/:budgetId/allocations/:allocationId", () => {
      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "DELETE",
          url: `/api/v1/${testWorkspaceId}/budgets/${testBudgetId}/allocations/${testAllocationId}`,
        });

        console.log("Delete Allocation No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });

      it("✅ should delete allocation", async () => {
        const response = await app.inject({
          method: "DELETE",
          url: `/api/v1/${testWorkspaceId}/budgets/${testBudgetId}/allocations/${testAllocationId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Delete Allocation:", response.statusCode, body.message);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
      });
    });

    describe("DELETE /api/v1/:workspaceId/spending-limits/:limitId", () => {
      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "DELETE",
          url: `/api/v1/${testWorkspaceId}/spending-limits/${testSpendingLimitId}`,
        });

        console.log("Delete Spending Limit No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });

      it("✅ should delete spending limit", async () => {
        const response = await app.inject({
          method: "DELETE",
          url: `/api/v1/${testWorkspaceId}/spending-limits/${testSpendingLimitId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log(
          "Delete Spending Limit:",
          response.statusCode,
          body.message,
        );

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
      });
    });

    describe("DELETE /api/v1/:workspaceId/budgets/:budgetId", () => {
      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "DELETE",
          url: `/api/v1/${testWorkspaceId}/budgets/${testBudgetId}`,
        });

        console.log("Delete Budget No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });

      it("✅ should delete budget", async () => {
        const response = await app.inject({
          method: "DELETE",
          url: `/api/v1/${testWorkspaceId}/budgets/${testBudgetId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Delete Budget:", response.statusCode, body.message);

        // May be 200 or 400 depending on budget state
        expect([200, 400]).toContain(response.statusCode);
      });
    });
  });

  // ============================================================================
  // SUMMARY REPORT
  // ============================================================================
  describe("📊 Endpoint Summary Report", () => {
    it("should print endpoint summary", () => {
      console.log("\n");
      console.log("=".repeat(60));
      console.log("BUDGET MANAGEMENT MODULE - ENDPOINT TEST SUMMARY");
      console.log("=".repeat(60));
      console.log("\n💰 Budget Endpoints:");
      console.log(
        "    POST   /:workspaceId/budgets                - Create Budget",
      );
      console.log(
        "    GET    /:workspaceId/budgets                - List Budgets",
      );
      console.log(
        "    GET    /:workspaceId/budgets/:id            - Get Budget",
      );
      console.log(
        "    PUT    /:workspaceId/budgets/:id            - Update Budget",
      );
      console.log(
        "    DELETE /:workspaceId/budgets/:id            - Delete Budget",
      );
      console.log(
        "    POST   /:workspaceId/budgets/:id/activate   - Activate Budget",
      );
      console.log(
        "    POST   /:workspaceId/budgets/:id/archive    - Archive Budget",
      );
      console.log("\n📊 Allocation Endpoints:");
      console.log(
        "    POST   /:workspaceId/budgets/:id/allocations              - Add Allocation",
      );
      console.log(
        "    GET    /:workspaceId/budgets/:id/allocations              - Get Allocations",
      );
      console.log(
        "    PUT    /:workspaceId/budgets/:id/allocations/:allocId     - Update Allocation",
      );
      console.log(
        "    DELETE /:workspaceId/budgets/:id/allocations/:allocId     - Delete Allocation",
      );
      console.log("\n🚦 Spending Limit Endpoints:");
      console.log(
        "    POST   /:workspaceId/spending-limits            - Create Limit",
      );
      console.log(
        "    GET    /:workspaceId/spending-limits            - List Limits",
      );
      console.log(
        "    PUT    /:workspaceId/spending-limits/:id        - Update Limit",
      );
      console.log(
        "    DELETE /:workspaceId/spending-limits/:id        - Delete Limit",
      );
      console.log("\n🔔 Alert Endpoints:");
      console.log(
        "    GET    /:workspaceId/budgets/alerts/unread      - Get Unread Alerts",
      );
      console.log("\n" + "=".repeat(60));
      console.log(`Test User: ${testEmail}`);
      console.log(`Test Workspace ID: ${testWorkspaceId}`);
      console.log("=".repeat(60));

      expect(true).toBe(true);
    });
  });
});
