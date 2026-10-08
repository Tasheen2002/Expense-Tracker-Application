module.exports = {
  root: true,
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  env: { node: true, es2022: true },
  extends: ['eslint:recommended'],
  plugins: ['@typescript-eslint'],
  rules: {
    // TypeScript checks identifiers and intentionally unused declaration types.
    'no-undef': 'off',
    'no-unused-vars': 'off',
    'no-redeclare': 'off',
    'no-dupe-class-members': 'off',
    // tsc checks redeclarations while allowing a type and value to share a name.
    '@typescript-eslint/no-dupe-class-members': 'error',
    'no-inner-declarations': 'off', // Block-scoped functions are valid in strict ES2022.
    'no-constant-condition': ['error', { checkLoops: false }],
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-debugger': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    eqeqeq: ['error', 'always', { null: 'ignore' }],
  },
  overrides: [{
    files: ['apps/*/src/shared/response.helper.ts', 'apps/*/src/shared/infrastructure/persistence/prisma-repository.helper.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  }],
};
