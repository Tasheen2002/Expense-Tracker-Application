import { spawnSync } from 'node:child_process';

// The original bug reproductions are now assertions of the corrected behavior.
const result = spawnSync(process.execPath, [
  'node_modules/vitest/vitest.mjs', 'run', '--root', 'apps/receipt-vault-service', '--config', 'vitest.config.ts',
  'src/modules/receipt-vault/tests/domain-regressions.unit.test.ts',
], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
