import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@prisma/client': path.resolve(__dirname, './src/generated/prisma-client'),
      '@core': path.resolve(__dirname, '../../packages/core/src'),
      '@packages': path.resolve(__dirname, '../../packages'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@modules': path.resolve(__dirname, './src/modules'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/generated/**'],
    testTimeout: 30000,
  },
});
