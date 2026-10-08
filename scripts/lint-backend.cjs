const {
  ESLint,
} = require('../packages/config/eslint-config/node_modules/eslint');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const services = [
  'identity-access-service',
  'approval-policy-service',
  'expense-budgeting-service',
  'audit-compliance-service',
  'bank-feed-service',
  'notification-service',
  'categorization-service',
  'receipt-vault-service',
  'gateway',
];
const selected = process.argv[2];
if (selected && !services.includes(selected))
  throw new Error('Unknown backend service');
(async () => {
  const eslint = new ESLint({
    cwd: root,
    useEslintrc: false,
    resolvePluginsRelativeTo: resolve(root, 'packages/config/eslint-config'),
    overrideConfigFile: resolve(
      root,
      'packages/config/eslint-config/backend.cjs'
    ),
    overrideConfig: {
      ignorePatterns: [
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/*.d.ts',
      ],
    },
  });
  const patterns = (selected ? [selected] : services).map(
    (service) => `apps/${service}/src/**/*.ts`
  );
  if (!selected) patterns.push('packages/*/src/**/*.ts');
  const results = await eslint.lintFiles(patterns);
  const formatter = await eslint.loadFormatter('stylish');
  const output = formatter.format(results);
  if (output) console.log(output);
  const errors = results.reduce(
    (sum, result) => sum + result.errorCount + result.warningCount,
    0
  );
  console.log(`Backend lint: ${results.length} files, ${errors} findings`);
  if (errors) process.exitCode = 1;
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
