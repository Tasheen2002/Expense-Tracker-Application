import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "../../../apps/api/src/server";
import { FastifyInstance } from "fastify";

describe("Expense-Ledger Module - Expense Service", () => {
  let server: FastifyInstance;
  let token: string;
  let workspaceId: string;
  let categoryId: string;
  let tagId: string;

  beforeAll(async () => {
    server = await createServer();

    // Register & Login User
    const regRes = await server.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "ledger@test.com",
        password: "password123",
        fullName: "Ledger User",
      },
    });
    const loginRes = await server.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ledger@test.com", password: "password123" },
    });
    token = JSON.parse(loginRes.body).data.token;

    // Create Workspace
    const wsRes = await server.inject({
      method: "POST",
      url: "/workspaces",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Ledger WS", description: "Testing Ledger" },
    });
    workspaceId = JSON.parse(wsRes.body).data.workspaceId;

    // Create Tag
    const tagRes = await server.inject({
      method: "POST",
      url: `/api/v1/${workspaceId}/tags`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Test Tag", color: "#000000" },
    });
    tagId = JSON.parse(tagRes.body).data.tagId;
  });

  afterAll(async () => {
    await server.close();
  });

  it("should handle duplicate tags gracefully (Bug Fix Verification)", async () => {
    // Attempt to create expense with DUPLICATE tag IDs
    const response = await server.inject({
      method: "POST",
      url: `/api/v1/${workspaceId}/expenses`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: "Duplicate Tag Test",
        amount: 100,
        currency: "USD",
        expenseDate: "2023-01-01",
        paymentMethod: "CASH",
        isReimbursable: false,
        tagIds: [tagId, tagId], // DUPLICATE SENT HERE
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    // Should handle it without erroring "Tags not found" due to count mismatch
  });

  it("should fail with invalid tax", async () => {
    // Negative test case can go here
  });
});
