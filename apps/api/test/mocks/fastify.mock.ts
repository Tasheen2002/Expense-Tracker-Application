export const createMockRequest = (overrides = {}) => ({
  params: {},
  body: {},
  query: {},
  headers: {},
  user: { userId: "test-user-id", workspaceId: "test-workspace-id" },
  ...overrides,
});

export const createMockReply = () => {
  const reply = {
    code: (statusCode: number) => {
      reply.statusCode = statusCode;
      return reply;
    },
    status: (statusCode: number) => {
      reply.statusCode = statusCode;
      return reply;
    },
    send: (payload: any) => {
      reply.body = payload;
      return reply;
    },
    statusCode: 200,
    body: null,
  } as any;
  return reply;
};
