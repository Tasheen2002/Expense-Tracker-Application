import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@prisma/client': path.resolve(__dirname, './node_modules/.prisma/client-approval'),
      '@core': path.resolve(__dirname, '../../packages/core/src'),
      '@packages': path.resolve(__dirname, '../../packages'),
      '@shared/middleware': path.resolve(__dirname, '../../packages/middleware/src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@modules/approval-workflow': path.resolve(__dirname, './src/modules/approval-workflow'),
      '@modules/policy-controls': path.resolve(__dirname, './src/modules/policy-controls'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
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
        'src/types/**',
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
