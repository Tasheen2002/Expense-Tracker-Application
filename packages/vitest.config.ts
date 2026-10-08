import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: {
    '@expense-tracker/resilience': path.resolve(__dirname, 'resilience/src'),
    '@core': path.resolve(__dirname, 'core/src'),
  } },
  test: {
    environment: 'node',
    include: ['packages/tests/**/*.test.ts', 'packages/outbox-kit/tests/**/*.test.ts'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      all: true,
      include: [
        'packages/{contracts,core,correlation,middleware,outbox-kit,resilience}/src/**/*.ts',
      ],
      exclude: ['**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
});
