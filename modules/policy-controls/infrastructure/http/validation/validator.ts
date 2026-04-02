import { FastifyRequest, FastifyReply } from 'fastify';
import { AnyZodObject, ZodError } from 'zod';

export const validateBody = (schema: AnyZodObject) => async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    request.body = schema.parse(request.body);
  } catch (error) {
    if (error instanceof ZodError) {
      reply.status(400).send({ success: false, statusCode: 400, error: 'Bad Request', message: error.errors.map(e => e.message).join(', ') });
    }
  }
};

export const validateParams = (schema: AnyZodObject) => async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    request.params = schema.parse(request.params);
  } catch (error) {
    if (error instanceof ZodError) {
      reply.status(400).send({ success: false, statusCode: 400, error: 'Bad Request', message: error.errors.map(e => e.message).join(', ') });
    }
  }
};

export const validateQuery = (schema: AnyZodObject) => async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    request.query = schema.parse(request.query);
  } catch (error) {
    if (error instanceof ZodError) {
      reply.status(400).send({ success: false, statusCode: 400, error: 'Bad Request', message: error.errors.map(e => e.message).join(', ') });
    }
  }
};
