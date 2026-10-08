const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

test('Approval development runtime loads shared exports without bundling', () => {
  const result = spawnSync(process.execPath, [require.resolve('tsx/cli'), '-e',
    "import('./src/runtime.ts').then(()=>console.log('runtime-loaded')).catch(e=>{console.error(e.message);process.exitCode=1})"], {
    cwd: path.resolve(__dirname, '../apps/approval-policy-service'), encoding: 'utf8', timeout: 30000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /runtime-loaded/);
});

test('CI smoke credentials initialize the bank token cipher', () => {
  const writes = new Map();
  runInNewContext(readFileSync(path.join(__dirname, 'ci-backend-workflows.cjs'), 'utf8'), {
    require(name) {
      if (name === 'node:fs') return {
        writeFileSync: (file, content) => writes.set(file, content),
        existsSync: () => false,
        unlinkSync: () => {},
      };
      if (name === 'node:child_process') return { spawnSync: () => ({ status: 0 }) };
      return require(name);
    },
    process: { env: { GITHUB_ACTIONS: 'true' }, execPath: process.execPath },
  });
  const credentials = require('dotenv').parse(writes.get('.env.docker-smoke'));
  const result = spawnSync(process.execPath, [require.resolve('tsx/cli'), '-e',
    "import { BankTokenCipher } from './src/shared/infrastructure/security/bank-token-cipher.ts'; const cipher = new BankTokenCipher(process.env.BANK_FEED_TOKEN_ENCRYPTION_KEY); const token = cipher.encrypt('fixture-token', 'connection', 'workspace'); if (cipher.decrypt(token, 'connection', 'workspace') !== 'fixture-token') throw new Error('Cipher round-trip failed'); console.log('cipher-ready')"], {
    cwd: path.resolve(__dirname, '../apps/bank-feed-service'),
    env: { ...process.env, BANK_FEED_TOKEN_ENCRYPTION_KEY: credentials.BANK_FEED_TOKEN_ENCRYPTION_KEY },
    encoding: 'utf8', timeout: 30000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /cipher-ready/);
});

test('Receipt restoration helpers use the running container image without pulling', () => {
  const source = readFileSync(path.join(__dirname, 'verify-database-backup.cjs'), 'utf8');
  const start = source.indexOf('function copyReceiptFiles()');
  const end = source.indexOf('async function main()', start);
  assert.ok(start >= 0 && end > start, 'Restore helper must be available');
  const image = `sha256:${'a'.repeat(64)}`;
  const commands = [];
  const restoredFiles = [{ key: 'fixture.pdf', size: 12, sha256: 'fixture-hash' }];
  const manifests = [];
  const restored = runInNewContext(source.slice(start, end) + '\ncopyReceiptFiles();', {
    assert, join: path.join, directory: '/private-backup', restoreVolume: 'fixture-restore-volume',
    volumeCreated: false,
    writeFileSync: (file, content) => manifests.push({ file, content }),
    docker(args) {
      commands.push(args);
      if (args[0] === 'inspect') return image;
      if (args[0] === 'run' && args.at(-1).includes('console.log(JSON.stringify(rows))')) {
        return JSON.stringify(restoredFiles);
      }
      return '';
    },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(restored)), restoredFiles);
  assert.equal(manifests.length, 1);
  assert.equal(commands[0].join(' '), 'inspect --format {{.Image}} expense_smoke_receipt');
  const helpers = commands.filter(args => args[0] === 'run');
  assert.equal(helpers.length, 4);
  for (const args of helpers) {
    assert.equal(args[args.indexOf('--entrypoint') + 2], image);
    assert.equal(args[args.indexOf('--pull') + 1], 'never');
    assert.equal(args[args.indexOf('--network') + 1], 'none');
  }
});
