import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "../../../apps/api/src/server";
import { FastifyInstance } from "fastify";
import { WorkspaceRole } from "../domain/entities/workspace-membership.entity";

describe("Identity-Workspace Module - Member Controller", () => {
  let server: FastifyInstance;
  let ownerToken: string;
  let memberToken: string;
  let ownerId: string;
  let memberId: string;
  let workspaceId: string;
  const uniqueId = Date.now();
  const ownerEmail = `owner_${uniqueId}@test.com`;
  const memberEmail = `member_${uniqueId}@test.com`;

  beforeAll(async () => {
    server = await createServer();
  });

  afterAll(async () => {
    // Cleanup
    if (ownerId) {
      await (server as any).prisma.$executeRawUnsafe(
        `DELETE FROM identity_workspace.user_account WHERE id = '${ownerId}'`,
      );
    }
    if (memberId) {
      await (server as any).prisma.$executeRawUnsafe(
        `DELETE FROM identity_workspace.user_account WHERE id = '${memberId}'`,
      );
    }
    await server.close();
  });

  it("should setup owner and workspace", async () => {
    // Register Owner
    const regResponse = await server.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: ownerEmail,
        password: "password123",
        fullName: "Owner",
      },
    });
    ownerId = JSON.parse(regResponse.body).data.userId;

    // Login Owner
    const loginResponse = await server.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: ownerEmail, password: "password123" },
    });
    ownerToken = JSON.parse(loginResponse.body).data.token;

    // Create Workspace
    const wsResponse = await server.inject({
      method: "POST",
      url: "/workspaces",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        name: `Test Workspace ${uniqueId}`,
        description: "Testing Members",
      },
    });
    expect(wsResponse.statusCode).toBe(201);
    workspaceId = JSON.parse(wsResponse.body).data.workspaceId;
  });

  it("should setup member to be added", async () => {
    // Register Member
    const regResponse = await server.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: memberEmail,
        password: "password123",
        fullName: "Member",
      },
    });
    memberId = JSON.parse(regResponse.body).data.userId;

    // Login Member
    const loginResponse = await server.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: memberEmail, password: "password123" },
    });
    memberToken = JSON.parse(loginResponse.body).data.token;

    // Add Member to Workspace
    const addResponse = await server.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/invitations`, // Assuming invitation flow or direct add is needed,
      // check if we have addMember endpoint. Usually via invitation.
      // For this test, let's Insert directly into DB to bypass invitation if needed, OR use available API.
      // There is no direct "add member" API usually, it's invite -> accept.
      // To keep it simple and test Controller logic, let's direct insert membership via Prisma.
    });

    // Direct Insert Membership
    await (server as any).prisma.workspaceMembership.create({
      data: {
        user: { connect: { id: memberId } },
        workspace: { connect: { id: workspaceId } },
        role: "MEMBER",
      },
    });
  });

  it("should change member role successfully", async () => {
    // Ensure membership exists
    const membersResponse = await server.inject({
      method: "GET",
      url: `/workspaces/${workspaceId}/members`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(JSON.parse(membersResponse.body).data).toHaveLength(2); // Owner + Member

    // Change Role
    const response = await server.inject({
      method: "PATCH",
      url: `/workspaces/${workspaceId}/members/${memberId}/role`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { role: "admin" },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).success).toBe(true);

    // Verify Role Logic in Controller (it should not fail looking up membership)
  });

  it("should remove member successfully", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: `/workspaces/${workspaceId}/members/${memberId}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toBe(
      "Member removed successfully",
    );

    // Verify removal
    const membersResponse = await server.inject({
      method: "GET",
      url: `/workspaces/${workspaceId}/members`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    const members = JSON.parse(membersResponse.body).data;
    expect(members).toHaveLength(1); // Only Owner
    expect(members[0].userId).toBe(ownerId);
  });
});
