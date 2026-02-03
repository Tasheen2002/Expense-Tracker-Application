import { FastifyReply } from "fastify";
import { ZodSchema, ZodError } from "zod";

export async function validateRequest<T>(
  schema: ZodSchema<T>,
  data: unknown,
  reply: FastifyReply,
): Promise<T | null> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      reply.status(400).send({
        success: false,
        statusCode: 400,
        error: "Validation Error",
        message: error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
        details: error.errors,
      });
      return null;
    }
    throw error;
  }
}
