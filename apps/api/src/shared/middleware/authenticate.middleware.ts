import { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  await (request.server as unknown as { authenticate(req: FastifyRequest): Promise<void> }).authenticate(request);
}
