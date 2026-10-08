import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@prisma/client': path.resolve(
        __dirname,
        './node_modules/.prisma/client-notification'
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
    globals: true,
    environment: 'node',
    // Integration files share one explicitly selected PostgreSQL database.
    // Queue workers claim globally and some tests temporarily change schema;
    // concurrent files would interfere even when their fixture IDs differ.
    // Individual regression tests still exercise concurrent operations.
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
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 90 },
    },
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 30000,
  },
});
