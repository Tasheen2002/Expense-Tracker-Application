// Runs desired-behavior regressions replacing the historical defect probes.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(__dirname, '..');
const result = spawnSync(process.execPath, [
  resolve(root, 'node_modules/vitest/vitest.mjs'), 'run',
  'src/modules/receipt-vault/tests/application.unit.test.ts',
  'src/modules/receipt-vault/tests/persistence-contracts.unit.test.ts',
], { cwd: resolve(root, 'apps/receipt-vault-service'), stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
