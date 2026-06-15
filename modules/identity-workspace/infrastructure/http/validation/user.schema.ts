import { z } from 'zod';
import {
  USER_EMAIL_MAX_LENGTH,
  USER_FULLNAME_MAX_LENGTH,
  USER_PASSWORD_MIN_LENGTH,
  USER_PASSWORD_MAX_LENGTH,
  EMAIL_REGEX,
} from '../../../domain/constants/identity.constants';
import { toJsonSchema } from './validator';

/**
 * Register User Schema
 */
export const registerUserSchema = z.object({
  email: z
    .string()
    .max(USER_EMAIL_MAX_LENGTH, `Email cannot exceed ${USER_EMAIL_MAX_LENGTH} characters`)
    .regex(EMAIL_REGEX, 'Invalid email format'),
  password: z
    .string()
    .min(USER_PASSWORD_MIN_LENGTH, `Password must be at least ${USER_PASSWORD_MIN_LENGTH} characters`)
    .max(USER_PASSWORD_MAX_LENGTH, `Password cannot exceed ${USER_PASSWORD_MAX_LENGTH} characters`),
  fullName: z
    .string()
    .max(USER_FULLNAME_MAX_LENGTH, `Full name cannot exceed ${USER_FULLNAME_MAX_LENGTH} characters`)
    .optional(),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

/**
 * Login User Schema
 */
export const loginUserSchema = z.object({
  email: z.string().regex(EMAIL_REGEX, 'Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginUserInput = z.infer<typeof loginUserSchema>;

/**
 * Update User Schema
 */
export const updateUserSchema = z.object({
  fullName: z.string().max(USER_FULLNAME_MAX_LENGTH).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/**
 * User Response Schema
 */
export const userResponseSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().nullable(),
  isActive: z.boolean(),
  emailVerified: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

// Pre-computed JSON schemas for routes
export const registerUserBodyJsonSchema = toJsonSchema(registerUserSchema);
export const loginUserBodyJsonSchema = toJsonSchema(loginUserSchema);

export const registerSuccessResponseJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: userResponseSchema,
  })
);

export const loginSuccessResponseJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      user: userResponseSchema.omit({ createdAt: true, updatedAt: true }),
      token: z.string(),
    }),
  })
);

export const meSuccessResponseJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      userId: z.string().uuid(),
      email: z.string().email(),
      workspaceId: z.string().uuid().nullable().optional(),
    }),
  })
);
