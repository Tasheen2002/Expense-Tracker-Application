import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Preserve an explicitly supplied DATABASE_URL so integration tests can target
// an isolated database instead of the developer's service-local database.
dotenv.config({ path: path.resolve(__dirname, '.env') });
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@prisma/client': path.resolve(__dirname, './node_modules/.prisma/client-expense'),
      '@core': path.resolve(__dirname, '../../packages/core/src'),
      '@packages': path.resolve(__dirname, '../../packages'),
      '@shared/middleware': path.resolve(__dirname, '../../packages/middleware/src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@modules': path.resolve(__dirname, './src/modules'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/index.ts',
        'src/**/index.ts',
        'src/types/**',
        'src/shared/infrastructure/cache/**',
      ],
      reporter: ['text', 'json', 'html', 'json-summary'],
      thresholds: {
        lines: 75,
        statements: 75,
        branches: 75,
        functions: 68,
      },
    },
    testTimeout: 30000,
  },
});
