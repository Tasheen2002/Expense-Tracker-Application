import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@prisma/client': path.resolve(
        __dirname,
        './node_modules/.prisma/client-bank-feed'
      ),
      '@core': path.resolve(__dirname, '../../packages/core/src'),
      '@packages': path.resolve(__dirname, '../../packages'),
      '@shared/middleware': path.resolve(
        __dirname,
        '../../packages/middleware/src'
      ),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  test: {
    env: {
      BANK_FEED_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
    },
    globals: true,
    environment: 'node',
    // Integration files share a database and native Prisma clients. Isolate them
    // in one fork instead of worker threads; tests still exercise concurrent writes.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/index.ts',
        'src/types/**',
      ],
      reporter: ['text', 'json-summary'],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 30000,
  },
});
