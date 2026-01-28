import { FastifyRequest, FastifyReply } from "fastify";
import { ZodSchema, ZodError } from "zod";

export const validateRequest = async <T>(
  request: FastifyRequest,
  schema: ZodSchema<T>,
): Promise<T> => {
  try {
    return await schema.parseAsync(request.body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw error; // Let the error handler plugin handle it
    }
    throw new Error("Validation failed");
  }
};
