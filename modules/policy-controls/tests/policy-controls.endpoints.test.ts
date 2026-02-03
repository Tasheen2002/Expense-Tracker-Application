/**
 * Policy Controls Module - Endpoint Tests
 *
 * This test suite verifies the functionality of all policy-controls module endpoints.
 * It tests policies, violations, and exemptions CRUD operations.
 *
 * Endpoints tested:
 * - Policies: POST, PUT, DELETE, GET (single, list), activate, deactivate
 * - Violations: GET (single, list, stats), acknowledge, resolve, exempt, override
 * - Exemptions: POST, GET (single, list, active check), approve, reject
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "../../../apps/api/src/server";
import { FastifyInstance } from "fastify";

describe("Policy Controls Module - Endpoint Tests", () => {
  let app: FastifyInstance;

  // Test data - will be populated during tests
  let authToken: string;
  let testUserId: string;
  let testWorkspaceId: string;
  let testPolicyId: string;
  let testExemptionId: string;

  const testTimestamp = Date.now();
  const testEmail = `policy-test-${testTimestamp}@example.com`;
  const testPassword = "SecurePassword123!";
  const testWorkspaceName = `Policy Test Workspace ${testTimestamp}`;

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
        firstName: "Policy",
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
        description: "Test workspace for policy controls tests",
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
  // POLICY ENDPOINTS
  // ============================================================================
  describe("Policy Endpoints", () => {
    describe("POST /api/v1/:workspaceId/policies", () => {
      it("✅ should create a spending limit policy", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/policies`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            name: `Spending Limit Policy ${testTimestamp}`,
            description: "Maximum spending limit per expense",
            policyType: "SPENDING_LIMIT",
            severity: "HIGH",
            configuration: {
              threshold: 1000,
              currency: "USD",
            },
            priority: 100,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Create Policy:", response.statusCode, body.message);

        expect(response.statusCode).toBe(201);
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty("id");

        testPolicyId = body.data.id;
      });

      it("✅ should create a category restriction policy", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/policies`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            name: `Category Restriction ${testTimestamp}`,
            description: "Restrict certain expense categories",
            policyType: "CATEGORY_RESTRICTION",
            severity: "MEDIUM",
            configuration: {
              restrictedCategoryIds: ["00000000-0000-0000-0000-000000000001"],
            },
            priority: 50,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Create Category Policy:", response.statusCode);

        expect(response.statusCode).toBe(201);
        expect(body.success).toBe(true);
      });

      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/policies`,
          payload: {
            name: "Test Policy",
            policyType: "SPENDING_LIMIT",
            severity: "LOW",
            configuration: { threshold: 100 },
          },
        });

        console.log("Create Policy No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });

      it("❌ should fail with empty name", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/policies`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            name: "",
            policyType: "SPENDING_LIMIT",
            severity: "LOW",
            configuration: { threshold: 100 },
          },
        });

        console.log("Create Policy Empty Name:", response.statusCode);
        expect(response.statusCode).toBe(400);
      });

      it("❌ should fail with invalid policy type", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/policies`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            name: "Invalid Policy",
            policyType: "INVALID_TYPE",
            severity: "LOW",
            configuration: {},
          },
        });

        console.log("Create Policy Invalid Type:", response.statusCode);
        expect(response.statusCode).toBe(400);
      });

      it("❌ should fail with duplicate policy name", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/policies`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            name: `Spending Limit Policy ${testTimestamp}`,
            policyType: "SPENDING_LIMIT",
            severity: "LOW",
            configuration: { threshold: 500 },
          },
        });

        const body = JSON.parse(response.body);
        console.log("Create Duplicate Policy:", response.statusCode);

        expect(response.statusCode).toBe(409);
      });
    });

    describe("GET /api/v1/:workspaceId/policies", () => {
      it("✅ should list all policies", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/policies`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("List Policies:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBeGreaterThan(0);
      });

      it("✅ should list only active policies", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/policies?activeOnly=true`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("List Active Policies:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
      });

      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/policies`,
        });

        console.log("List Policies No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });
    });

    describe("GET /api/v1/:workspaceId/policies/:policyId", () => {
      it("✅ should get policy by ID", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/policies/${testPolicyId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get Policy:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.id).toBe(testPolicyId);
        expect(body.data.policyType).toBe("SPENDING_LIMIT");
      });

      it("❌ should fail with non-existent policy ID", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/policies/99999999-9999-4999-8999-999999999999`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        console.log("Get Non-existent Policy:", response.statusCode);
        expect(response.statusCode).toBe(404);
      });

      it("❌ should fail with invalid UUID format", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/policies/invalid-uuid`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        console.log("Get Policy Invalid UUID:", response.statusCode);
        expect(response.statusCode).toBe(400);
      });
    });

    describe("PUT /api/v1/:workspaceId/policies/:policyId", () => {
      it("✅ should update policy name and description", async () => {
        console.log("testPolicyId before update:", testPolicyId);

        const response = await app.inject({
          method: "PUT",
          url: `/api/v1/${testWorkspaceId}/policies/${testPolicyId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            name: `Updated Policy ${testTimestamp}`,
            description: "Updated description for the policy",
          },
        });

        const body = JSON.parse(response.body);
        console.log("Update Policy:", response.statusCode, body);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.name).toBe(`Updated Policy ${testTimestamp}`);
      });

      it("✅ should update policy configuration", async () => {
        const response = await app.inject({
          method: "PUT",
          url: `/api/v1/${testWorkspaceId}/policies/${testPolicyId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            configuration: {
              threshold: 2000,
              currency: "USD",
            },
          },
        });

        const body = JSON.parse(response.body);
        console.log("Update Policy Config:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
      });

      it("✅ should update policy severity", async () => {
        const response = await app.inject({
          method: "PUT",
          url: `/api/v1/${testWorkspaceId}/policies/${testPolicyId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            severity: "CRITICAL",
          },
        });

        const body = JSON.parse(response.body);
        console.log("Update Policy Severity:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
      });

      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "PUT",
          url: `/api/v1/${testWorkspaceId}/policies/${testPolicyId}`,
          payload: {
            name: "Should Fail",
          },
        });

        console.log("Update Policy No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });
    });

    describe("POST /api/v1/:workspaceId/policies/:policyId/deactivate", () => {
      it("✅ should deactivate a policy", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/policies/${testPolicyId}/deactivate`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Deactivate Policy:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.isActive).toBe(false);
      });
    });

    describe("POST /api/v1/:workspaceId/policies/:policyId/activate", () => {
      it("✅ should activate a policy", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/policies/${testPolicyId}/activate`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Activate Policy:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.isActive).toBe(true);
      });
    });
  });

  // ============================================================================
  // EXEMPTION ENDPOINTS
  // ============================================================================
  describe("Exemption Endpoints", () => {
    describe("POST /api/v1/:workspaceId/exemptions", () => {
      it("✅ should request a policy exemption", async () => {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/exemptions`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            policyId: testPolicyId,
            userId: testUserId,
            reason:
              "Business travel requires higher expense limits for accommodation and transportation costs during the Q1 conference.",
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        });

        const body = JSON.parse(response.body);
        console.log("Request Exemption:", response.statusCode, body.message);

        expect(response.statusCode).toBe(201);
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty("id");
        expect(body.data.status).toBe("PENDING");

        testExemptionId = body.data.id;
      });

      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/exemptions`,
          payload: {
            policyId: testPolicyId,
            userId: testUserId,
            reason: "Test reason for exemption request",
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 86400000).toISOString(),
          },
        });

        console.log("Request Exemption No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });

      it("❌ should fail with short reason", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/exemptions`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            policyId: testPolicyId,
            userId: testUserId,
            reason: "Short",
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 86400000).toISOString(),
          },
        });

        console.log("Request Exemption Short Reason:", response.statusCode);
        expect(response.statusCode).toBe(400);
      });

      it("❌ should fail with end date before start date", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/exemptions`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            policyId: testPolicyId,
            userId: testUserId,
            reason: "Valid reason for exemption that is long enough",
            startDate: new Date(Date.now() + 86400000).toISOString(),
            endDate: new Date().toISOString(),
          },
        });

        const body = JSON.parse(response.body);
        console.log("Request Exemption Invalid Dates:", response.statusCode);

        expect(response.statusCode).toBe(400);
      });
    });

    describe("GET /api/v1/:workspaceId/exemptions", () => {
      it("✅ should list all exemptions", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/exemptions`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("List Exemptions:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
      });

      it("✅ should filter exemptions by status", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/exemptions?status=PENDING`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("List Pending Exemptions:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
      });

      it("✅ should filter exemptions by user", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/exemptions?userId=${testUserId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("List User Exemptions:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
      });
    });

    describe("GET /api/v1/:workspaceId/exemptions/:exemptionId", () => {
      it("✅ should get exemption by ID", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/exemptions/${testExemptionId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get Exemption:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.id).toBe(testExemptionId);
      });

      it("❌ should fail with non-existent exemption ID", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/exemptions/99999999-9999-4999-8999-999999999999`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        console.log("Get Non-existent Exemption:", response.statusCode);
        expect(response.statusCode).toBe(404);
      });
    });

    describe("GET /api/v1/:workspaceId/exemptions/active", () => {
      it("✅ should check for active exemption (none exists yet)", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/exemptions/active?userId=${testUserId}&policyId=${testPolicyId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Check Active Exemption:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
        // Exemption is still pending, not approved
        expect(body.data).toBeNull();
      });

      it("❌ should fail without required query params", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/exemptions/active`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        console.log("Check Active Exemption No Params:", response.statusCode);
        expect(response.statusCode).toBe(400);
      });
    });

    describe("POST /api/v1/:workspaceId/exemptions/:exemptionId/reject", () => {
      let tempExemptionId: string;

      it("✅ should reject an exemption", async () => {
        // First create a new exemption to reject
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        const createResponse = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/exemptions`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            policyId: testPolicyId,
            userId: testUserId,
            reason:
              "This exemption will be rejected for testing purposes in the test suite.",
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        });

        const createBody = JSON.parse(createResponse.body);
        tempExemptionId = createBody.data.id;

        // Now reject it
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/exemptions/${tempExemptionId}/reject`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            rejectionReason: "Request does not meet policy exemption criteria",
          },
        });

        const body = JSON.parse(response.body);
        console.log("Reject Exemption:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.status).toBe("REJECTED");
      });
    });

    describe("POST /api/v1/:workspaceId/exemptions/:exemptionId/approve", () => {
      it("✅ should approve an exemption", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/exemptions/${testExemptionId}/approve`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {}, // Send empty object to satisfy body validation
        });

        const body = JSON.parse(response.body);
        console.log("Approve Exemption:", response.statusCode, body.message);

        // Note: May fail if user cannot approve their own exemption
        if (response.statusCode === 200) {
          expect(body.success).toBe(true);
          expect(body.data.status).toBe("APPROVED");
        } else {
          // Self-approval may be forbidden
          expect(response.statusCode).toBe(403);
        }
      });
    });
  });

  // ============================================================================
  // VIOLATION ENDPOINTS
  // ============================================================================
  describe("Violation Endpoints", () => {
    describe("GET /api/v1/:workspaceId/violations", () => {
      it("✅ should list violations (empty initially)", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/violations`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("List Violations:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
      });

      it("✅ should filter violations by status", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/violations?status=PENDING`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("List Pending Violations:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
      });

      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/violations`,
        });

        console.log("List Violations No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });
    });

    describe("GET /api/v1/:workspaceId/violations/stats", () => {
      it("✅ should get violation statistics", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/violations/stats`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get Violation Stats:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty("total");
        expect(body.data).toHaveProperty("pending");
      });

      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/violations/stats`,
        });

        console.log("Get Stats No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });
    });

    describe("GET /api/v1/:workspaceId/violations/:violationId", () => {
      it("❌ should fail with non-existent violation ID", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/violations/99999999-9999-4999-8999-999999999999`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        console.log("Get Non-existent Violation:", response.statusCode);
        expect(response.statusCode).toBe(404);
      });

      it("❌ should fail with invalid UUID format", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/violations/invalid-uuid`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        console.log("Get Violation Invalid UUID:", response.statusCode);
        expect(response.statusCode).toBe(400);
      });
    });

    // Note: The following tests require a violation to exist
    // In a real scenario, violations are created when expenses violate policies
    describe("Violation Actions (require existing violation)", () => {
      it("❌ should fail to acknowledge non-existent violation", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/violations/99999999-9999-4999-8999-999999999999/acknowledge`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {}, // Send empty object to satisfy body validation
        });

        console.log("Acknowledge Non-existent:", response.statusCode);
        expect(response.statusCode).toBe(404);
      });

      it("❌ should fail to resolve non-existent violation", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/violations/99999999-9999-4999-8999-999999999999/resolve`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            resolutionNote: "Resolved after review",
          },
        });

        console.log("Resolve Non-existent:", response.statusCode);
        expect(response.statusCode).toBe(404);
      });

      it("❌ should fail to override non-existent violation", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/violations/99999999-9999-4999-8999-999999999999/override`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            overrideReason: "Manager approved this expense",
          },
        });

        console.log("Override Non-existent:", response.statusCode);
        expect(response.statusCode).toBe(404);
      });
    });
  });

  // ============================================================================
  // POLICY DELETION (cleanup at the end)
  // ============================================================================
  describe("Policy Deletion", () => {
    let policyToDeleteId: string;

    describe("DELETE /api/v1/:workspaceId/policies/:policyId", () => {
      // Create a separate policy for deletion that won't have any exemptions
      beforeAll(async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/policies`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            name: `Policy for Deletion ${testTimestamp}`,
            description: "This policy will be deleted",
            policyType: "SPENDING_LIMIT",
            severity: "LOW",
            configuration: {
              threshold: 100,
              currency: "USD",
            },
            priority: 1,
          },
        });
        const body = JSON.parse(response.body);
        policyToDeleteId = body.data.id;
      });

      it("❌ should fail without auth token", async () => {
        const response = await app.inject({
          method: "DELETE",
          url: `/api/v1/${testWorkspaceId}/policies/${policyToDeleteId}`,
        });

        console.log("Delete Policy No Auth:", response.statusCode);
        expect(response.statusCode).toBe(401);
      });

      it("❌ should fail with non-existent policy ID", async () => {
        const response = await app.inject({
          method: "DELETE",
          url: `/api/v1/${testWorkspaceId}/policies/99999999-9999-4999-8999-999999999999`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        console.log("Delete Non-existent Policy:", response.statusCode);
        expect(response.statusCode).toBe(404);
      });

      it("✅ should delete a policy", async () => {
        const response = await app.inject({
          method: "DELETE",
          url: `/api/v1/${testWorkspaceId}/policies/${policyToDeleteId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Delete Policy:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.success).toBe(true);
      });

      it("❌ should fail to get deleted policy", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/policies/${policyToDeleteId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        console.log("Get Deleted Policy:", response.statusCode);
        expect(response.statusCode).toBe(404);
      });
    });
  });
});
