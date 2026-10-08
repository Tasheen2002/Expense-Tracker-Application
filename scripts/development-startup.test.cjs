const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('Approval development runtime loads shared exports without bundling', () => {
  const result = spawnSync(process.execPath, [require.resolve('tsx/cli'), '-e',
    "import('./src/runtime.ts').then(()=>console.log('runtime-loaded')).catch(e=>{console.error(e.message);process.exitCode=1})"], {
    cwd: path.resolve(__dirname, '../apps/approval-policy-service'), encoding: 'utf8', timeout: 30000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /runtime-loaded/);
});
