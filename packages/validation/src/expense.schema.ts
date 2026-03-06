import { z } from 'zod';

export const createExpenseSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  description: z.string().min(1).max(500),
  categoryId: z.string().uuid().optional(),
  date: z.coerce.date(),
  merchantName: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().uuid()).optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
