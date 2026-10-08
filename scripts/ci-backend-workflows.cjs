// CI only: build artifacts are supplied by the preceding Docker build step.
const { writeFileSync, existsSync, unlinkSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('This runner is restricted to ephemeral GitHub Actions hosts');
if (existsSync('.env.docker-smoke')) throw new Error('Refusing to overwrite existing smoke credentials');
process.env.BACKEND_REPORT_DIR = process.env.RUNNER_TEMP || tmpdir();
const credentials = ['POSTGRES_PASSWORD', 'JWT_SECRET', 'INTERNAL_API_KEY', 'BANK_FEED_TOKEN_ENCRYPTION_KEY', 'REDIS_PASSWORD'];
writeFileSync('.env.docker-smoke', credentials.map(key => {
  const encoding = key === 'BANK_FEED_TOKEN_ENCRYPTION_KEY' ? 'base64' : 'hex';
  return `${key}=${randomBytes(32).toString(encoding)}`;
}).join('\n') + '\n', { mode: 0o600 });
const services = ['gateway', 'identity-access-service', 'expense-budgeting-service', 'categorization-service',
  'approval-policy-service', 'bank-feed-service', 'receipt-vault-service', 'notification-service', 'audit-compliance-service'];
const images = join(tmpdir(), 'expense-ci-images.yml');
writeFileSync(images, 'services:\n' + services.map(name => `  ${name}:\n    image: expense-tracker/${name}:ci\n`).join(''));
const compose = ['compose', '-p', 'expense-smoke', '--env-file', '.env.docker-smoke',
  '-f', 'docker-compose.yml', '-f', 'docker-compose.mailpit.yml', '-f', 'docker-compose.smoke.yml', '-f', images];
function run(executable, args) {
  const result = spawnSync(executable, args, { stdio: 'inherit', timeout: 600000 });
  if (result.status !== 0) throw new Error(`${executable} ${args[0]} failed`);
}
try {
  run('docker', [...compose, 'up', '-d', '--wait', 'postgres', 'mailpit']);
  run(process.execPath, ['scripts/prepare-gateway-workflow.cjs']);
  run('docker', [...compose, 'up', '-d', '--no-build', '--pull', 'never', '--wait', '--wait-timeout', '180', ...services]);
  run(process.execPath, ['scripts/gateway-workflow-smoke.cjs']);
  run(process.execPath, ['--test', 'scripts/outbox-maintenance.integration.test.cjs']);
  run(process.execPath, ['scripts/verify-database-backup.cjs']);
} catch (error) {
  // Collect startup diagnostics before cleanup removes the failed containers.
  spawnSync('docker', [...compose, 'ps', '--all'], { stdio: 'inherit', timeout: 30000 });
  spawnSync('docker', [...compose, 'logs', '--no-color', '--tail', '80', ...services], { stdio: 'inherit', timeout: 30000 });
  throw error;
} finally {
  // This project and these volumes are created only on the ephemeral CI host.
  const result = spawnSync('docker', [...compose, 'down', '--volumes', '--remove-orphans'], { stdio: 'inherit', timeout: 120000 });
  if (result.status !== 0) process.exitCode = 1;
  unlinkSync('.env.docker-smoke');
  unlinkSync(images);
}
