import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@prisma/client': path.resolve(__dirname, './node_modules/.prisma/client-bank-feed'),
      '@core': path.resolve(__dirname, '../../packages/core/src'),
      '@packages': path.resolve(__dirname, '../../packages'),
      '@shared/middleware': path.resolve(__dirname, '../../packages/middleware/src'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  test: {
    env: { BANK_FEED_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64') },
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 30000,
  },
});
