import dotenv from 'dotenv';
import path from 'path';
import { defineConfig } from 'vitest/config';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

export default defineConfig({
  resolve: {
    alias: {
      '@prisma/client': path.resolve(__dirname, './node_modules/.prisma/client-identity'),
      '@core': path.resolve(__dirname, '../../packages/core/src'),
      '@packages': path.resolve(__dirname, '../../packages'),
      '@shared/middleware': path.resolve(__dirname, '../../packages/middleware/src'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
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
