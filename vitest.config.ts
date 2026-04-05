import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
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
