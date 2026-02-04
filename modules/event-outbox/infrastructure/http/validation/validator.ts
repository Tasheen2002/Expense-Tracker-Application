import { ZodSchema, ZodError } from "zod";

export function validateData<T>(
  schema: ZodSchema<T>,
  data: unknown,
):
  | { success: true; data: T }
  | { success: false; error: string; details: unknown } {
  try {
    return { success: true, data: schema.parse(data) };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: "Validation Error",
        details: error.errors,
      };
    }
    throw error;
  }
}
