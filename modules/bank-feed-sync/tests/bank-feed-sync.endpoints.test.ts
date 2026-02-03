/**
 * Bank Feed Sync Module - Endpoint Tests
 *
 * This test suite verifies the functionality of all bank-feed-sync module endpoints.
 * It tests bank connections, transaction syncing, and bank transaction processing.
 *
 * Endpoints tested:
 * - Bank Connections: POST, GET (single, list), PUT (token, disconnect), DELETE
 * - Transaction Sync: POST (sync), GET (history, session, active syncs)
 * - Bank Transactions: GET (pending, single, by connection), PUT (process)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "../../../apps/api/src/server";
import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";

describe("Bank Feed Sync Module - Endpoint Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  // Test data - will be populated during tests
  let authToken: string;
  let testUserId: string;
  let testWorkspaceId: string;
  let testConnectionId: string;
  let testSyncSessionId: string;
  let testTransactionId: string;

  const testTimestamp = Date.now();
  const testEmail = `bank-sync-test-${testTimestamp}@example.com`;
  const testPassword = "SecurePassword123!";
  const testWorkspaceName = `Bank Sync Test Workspace ${testTimestamp}`;

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
        firstName: "Bank",
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
        description: "Test workspace for bank feed sync tests",
      },
    });

    const workspaceBody = JSON.parse(workspaceResponse.body);
    console.log("Setup - Create Workspace:", workspaceResponse.statusCode);
    testWorkspaceId = workspaceBody.data?.workspaceId;
  });

  afterAll(async () => {
    // Cleanup test data
    if (prisma && testConnectionId) {
      await prisma.bankConnection.deleteMany({
        where: { id: testConnectionId },
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
  // BANK CONNECTION ENDPOINTS
  // ============================================================================
  describe("Bank Connection Endpoints", () => {
    describe("POST /api/v1/bank-feed/", () => {
      it("✅ should create a bank connection", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/connections`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            institutionId: "test_bank_001",
            institutionName: "Test Bank",
            accountId: "acc_12345",
            accountName: "Test Checking Account",
            accountType: "CHECKING",
            currency: "USD",
            accessToken: "test_access_token_" + testTimestamp,
            accountMask: "****1234",
          },
        });

        const body = JSON.parse(response.body);
        console.log(
          "Create Bank Connection:",
          response.statusCode,
          body.message,
        );

        expect(response.statusCode).toBe(201);
        expect(body).toHaveProperty("id");
        expect(body.institutionName).toBe("Test Bank");
        expect(body.accountType).toBe("CHECKING");
        expect(body.status).toBe("CONNECTED");

        testConnectionId = body.id;
      });

      it("❌ should fail to create connection with missing required fields", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/connections`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            institutionId: "test_bank_002",
            // Missing institutionName and other required fields
          },
        });

        expect(response.statusCode).toBe(400);
      });

      it("❌ should fail without authentication", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/connections`,
          payload: {
            institutionId: "test_bank_003",
            institutionName: "Another Bank",
            accountId: "acc_67890",
            accountName: "Savings",
            accountType: "SAVINGS",
            currency: "USD",
            accessToken: "test_token",
          },
        });

        expect(response.statusCode).toBe(401);
      });
    });

    describe("GET /api/v1/bank-feed/", () => {
      it("✅ should get all bank connections", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/connections`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get All Connections:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body).toHaveProperty("connections");
        expect(Array.isArray(body.connections)).toBe(true);
        expect(body.connections.length).toBeGreaterThan(0);
      });
    });

    describe("GET /api/v1/bank-feed/:connectionId", () => {
      it("✅ should get a specific bank connection", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/connections/${testConnectionId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get Connection:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.id).toBe(testConnectionId);
        expect(body.institutionName).toBe("Test Bank");
      });

      it("❌ should return 404 for non-existent connection", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/connections/${crypto.randomUUID()}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(404);
      });
    });

    describe("PUT /api/v1/bank-feed/:connectionId/token", () => {
      it("✅ should update connection access token", async () => {
        const newToken = "updated_access_token_" + Date.now();
        const response = await app.inject({
          method: "PUT",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/connections/${testConnectionId}/token`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            accessToken: newToken,
            tokenExpiresAt: new Date(
              Date.now() + 90 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
        });

        const body = JSON.parse(response.body);
        console.log("Update Token:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.id).toBe(testConnectionId);
      });

      it("❌ should fail with invalid connection ID", async () => {
        const response = await app.inject({
          method: "PUT",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/connections/invalid-id/token`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            accessToken: "new_token",
          },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe("PUT /api/v1/bank-feed/:connectionId/disconnect", () => {
      it("✅ should disconnect a bank connection", async () => {
        const response = await app.inject({
          method: "PUT",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/connections/${testConnectionId}/disconnect`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        console.log("Disconnect Connection:", response.statusCode);

        expect(response.statusCode).toBe(204);
      });
    });

    describe("DELETE /api/v1/bank-feed/:connectionId", () => {
      it("✅ should delete a bank connection", async () => {
        const response = await app.inject({
          method: "DELETE",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/connections/${testConnectionId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        console.log("Delete Connection:", response.statusCode);

        expect(response.statusCode).toBe(204);
      });

      it("❌ should return 404 when deleting non-existent connection", async () => {
        const response = await app.inject({
          method: "DELETE",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/connections/${crypto.randomUUID()}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(404);
      });
    });
  });

  // ============================================================================
  // TRANSACTION SYNC ENDPOINTS
  // ============================================================================
  describe("Transaction Sync Endpoints", () => {
    let activeConnectionId: string;

    beforeAll(async () => {
      // Create a new connection for sync tests
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/${testWorkspaceId}/bank-feed-sync/connections`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          institutionId: "test_bank_sync_001",
          institutionName: "Sync Test Bank",
          accountId: "acc_sync_12345",
          accountName: "Sync Test Account",
          accountType: "CHECKING",
          currency: "USD",
          accessToken: "sync_test_token_" + testTimestamp,
        },
      });

      const body = JSON.parse(response.body);
      activeConnectionId = body.id;
    });

    describe("POST /api/v1/bank-feed/:connectionId/sync", () => {
      it("✅ should trigger transaction sync for a connection", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/connections/${activeConnectionId}/sync`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            startDate: new Date(
              Date.now() - 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            endDate: new Date().toISOString(),
          },
        });

        const body = JSON.parse(response.body);
        console.log("Trigger Sync:", response.statusCode);

        expect(response.statusCode).toBe(202);
        expect(body).toHaveProperty("id");
        expect(body.status).toBe("COMPLETED"); // Stub API returns empty array

        testSyncSessionId = body.sessionId;
      });

      it("❌ should fail with invalid connection ID", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/connections/${crypto.randomUUID()}/sync`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {},
        });

        expect(response.statusCode).toBe(404);
      });
    });

    describe("GET /api/v1/bank-feed/:connectionId/sync/history", () => {
      it("✅ should get sync history for a connection", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/connections/${activeConnectionId}/sync/history`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          query: {
            limit: "10",
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get Sync History:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body).toHaveProperty("sessions");
        expect(Array.isArray(body.sessions)).toBe(true);
      });
    });

    describe("GET /api/v1/bank-feed/sync/:sessionId", () => {
      it("✅ should get a specific sync session", async () => {
        if (!testSyncSessionId) {
          console.log("⚠️ Skipping - No sync session ID available");
          return;
        }

        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/sync/${testSyncSessionId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get Sync Session:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.sessionId).toBe(testSyncSessionId);
        expect(body).toHaveProperty("status");
      });
    });

    describe("GET /api/v1/bank-feed/sync/active", () => {
      it("✅ should get all active sync sessions", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/sync/active`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get Active Syncs:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body).toHaveProperty("sessions");
        expect(Array.isArray(body.sessions)).toBe(true);
      });
    });
  });

  // ============================================================================
  // BANK TRANSACTION ENDPOINTS
  // ============================================================================
  describe("Bank Transaction Endpoints", () => {
    let testConnectionForTransactions: string;

    beforeAll(async () => {
      // Create a connection and add test transactions
      const connResponse = await app.inject({
        method: "POST",
        url: `/api/v1/${testWorkspaceId}/bank-feed-sync/connections`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          institutionId: "test_bank_txn_001",
          institutionName: "Transaction Test Bank",
          accountId: "acc_txn_12345",
          accountName: "Transaction Test Account",
          accountType: "CHECKING",
          currency: "USD",
          accessToken: "txn_test_token_" + testTimestamp,
        },
      });

      const connBody = JSON.parse(connResponse.body);
      testConnectionForTransactions = connBody.id;

      // Create sync session first
      const testSyncSession = await prisma.syncSession.create({
        data: {
          id: crypto.randomUUID(),
          workspaceId: testWorkspaceId,
          connectionId: testConnectionForTransactions,
          status: "IN_PROGRESS",
          startedAt: new Date(),
          transactionsFetched: 0,
          transactionsImported: 0,
          transactionsDuplicate: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create a test transaction manually in database
      const transaction = await prisma.bankTransaction.create({
        data: {
          id: crypto.randomUUID(),
          workspaceId: testWorkspaceId,
          externalId: "ext_txn_" + testTimestamp,
          amount: 150.0,
          currency: "USD",
          description: "Test transaction",
          merchantName: "Test Merchant",
          transactionDate: new Date(),
          postedDate: new Date(),
          status: "PENDING",
          createdAt: new Date(),
          updatedAt: new Date(),
          connection: {
            connect: { id: testConnectionForTransactions },
          },
          session: {
            connect: { id: testSyncSession.id },
          },
        },
      });

      testTransactionId = transaction.id;
    });

    describe("GET /api/v1/bank-feed/transactions/pending", () => {
      it("✅ should get pending transactions", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/transactions/pending`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get Pending Transactions:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body).toHaveProperty("transactions");
        expect(Array.isArray(body.transactions)).toBe(true);
      });

      it("✅ should filter pending transactions by connection", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/transactions/pending`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          query: {
            connectionId: testConnectionForTransactions,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get Pending by Connection:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body).toHaveProperty("transactions");
      });
    });

    describe("GET /api/v1/bank-feed/transactions/:transactionId", () => {
      it("✅ should get a specific transaction", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/transactions/${testTransactionId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get Transaction:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.id).toBe(testTransactionId);
        expect(body.status).toBe("PENDING");
      });

      it("❌ should return 404 for non-existent transaction", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/transactions/${crypto.randomUUID()}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(404);
      });
    });

    describe("PUT /api/v1/bank-feed/transactions/:transactionId/process", () => {
      it("✅ should mark transaction as imported", async () => {
        const response = await app.inject({
          method: "PUT",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/transactions/${testTransactionId}/process`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            action: "import",
            expenseId: crypto.randomUUID(),
          },
        });

        const body = JSON.parse(response.body);
        console.log("Process Transaction (import):", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.status).toBe("IMPORTED");
      });

      it("✅ should mark transaction as ignored", async () => {
        // Create sync session for second transaction
        const testSyncSession2 = await prisma.syncSession.create({
          data: {
            id: crypto.randomUUID(),
            workspaceId: testWorkspaceId,
            connectionId: testConnectionForTransactions,
            status: "IN_PROGRESS",
            startedAt: new Date(),
            transactionsFetched: 0,
            transactionsImported: 0,
            transactionsDuplicate: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Create another test transaction
        const newTransaction = await prisma.bankTransaction.create({
          data: {
            id: crypto.randomUUID(),
            workspaceId: testWorkspaceId,
            externalId: "ext_txn_ignore_" + testTimestamp,
            amount: 50.0,
            currency: "USD",
            description: "Transaction to ignore",
            transactionDate: new Date(),
            postedDate: new Date(),
            status: "PENDING",
            createdAt: new Date(),
            updatedAt: new Date(),
            connection: {
              connect: { id: testConnectionForTransactions },
            },
            session: {
              connect: { id: testSyncSession2.id },
            },
          },
        });

        const response = await app.inject({
          method: "PUT",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/transactions/${newTransaction.id}/process`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            action: "ignore",
          },
        });

        const body = JSON.parse(response.body);
        console.log("Process Transaction (ignore):", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body.status).toBe("IGNORED");
      });

      it("❌ should fail with invalid action", async () => {
        const response = await app.inject({
          method: "PUT",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/transactions/${testTransactionId}/process`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            action: "invalid_action",
          },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe("GET /api/v1/bank-feed/transactions/connection/:connectionId", () => {
      it("✅ should get all transactions for a connection", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/${testWorkspaceId}/bank-feed-sync/transactions/connection/${testConnectionForTransactions}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        const body = JSON.parse(response.body);
        console.log("Get Transactions by Connection:", response.statusCode);

        expect(response.statusCode).toBe(200);
        expect(body).toHaveProperty("transactions");
        expect(Array.isArray(body.transactions)).toBe(true);
        expect(body.transactions.length).toBeGreaterThan(0);
      });
    });
  });
});
