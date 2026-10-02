import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); });

it('preserves an explicitly selected test database when loading configuration', async () => {
  const isolatedUrl = 'postgresql://review:review@localhost:5432/explicit_test_database';
  vi.stubEnv('DATABASE_URL', isolatedUrl);
  vi.resetModules();
  await import('../../../vitest.config');
  expect(process.env.DATABASE_URL).toBe(isolatedUrl);
});
