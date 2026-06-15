import 'dotenv/config';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'packages/core/src'),
      '@packages': path.resolve(__dirname, 'packages'),
      '@modules': path.resolve(__dirname, 'modules'),
      '@shared': path.resolve(__dirname, 'apps/api/src/shared'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['modules/**/*.test.ts', 'apps/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['modules/**/*.ts'],
      exclude: ['**/*.test.ts', '**/index.ts'],
    },
  },
});
