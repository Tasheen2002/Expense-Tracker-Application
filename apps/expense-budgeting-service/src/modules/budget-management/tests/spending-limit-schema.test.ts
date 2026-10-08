import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import {
  createSpendingLimitBodyJsonSchema,
  createSpendingLimitSchema,
} from '../infrastructure/http/validation/spending-limit.schema';
import { validateBody } from '../infrastructure/http/validation/validator';

describe('spending-limit HTTP amount contract', () => {
  it('compiles with strict Ajv and accepts string and numeric amounts', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const app = Fastify();
    try {
      app.post('/limits', {
        schema: { body: createSpendingLimitBodyJsonSchema },
        preValidation: validateBody(createSpendingLimitSchema),
      }, async request => request.body);
      await app.ready();
      expect(warning.mock.calls.flat().join(' ')).not.toContain('allowUnionTypes');
      for (const limitAmount of [12.34, '12.34']) {
        const response = await app.inject({ method: 'POST', url: '/limits',
          payload: { limitAmount, currency: 'USD', periodType: 'MONTHLY' } });
        expect(response.statusCode).toBe(200);
        expect(Number(response.json().limitAmount)).toBe(Number(limitAmount));
      }
      for (const limitAmount of [0, -1, 'NaN', '12.345']) {
        const response = await app.inject({ method: 'POST', url: '/limits',
          payload: { limitAmount, currency: 'USD', periodType: 'MONTHLY' } });
        expect(response.statusCode).toBe(400);
      }
    } finally { await app.close(); warning.mockRestore(); }
  });
});
