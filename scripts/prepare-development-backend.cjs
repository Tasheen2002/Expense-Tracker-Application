// Explicit local setup: preserve existing databases and apply committed migrations.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { randomBytes, createDecipheriv } = require('node:crypto');
const dotenv = require('dotenv');
const { PrismaClient } = require('../apps/receipt-vault-service/node_modules/.prisma/client-receipt-vault');
const root = path.resolve(__dirname, '..');
const services = ['identity-access', 'approval-policy', 'expense-budgeting', 'categorization',
  'receipt-vault', 'audit-compliance', 'notification', 'bank-feed'];
const log = path.join(os.tmpdir(), 'expense-development-migrations.log');
const readEnv = (file) => fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
const defaults = readEnv(path.join(root, '.env'));

function saveEnvValue(file, name, value) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const pattern = new RegExp(`^${name}=.*$`, 'm');
  fs.writeFileSync(file, pattern.test(text) ? text.replace(pattern, `${name}=${value}`)
    : `${text.trimEnd()}\n${name}=${value}\n`);
}

function alignLocalInternalKey() {
  const candidates = [process.env.INTERNAL_API_KEY, defaults.INTERNAL_API_KEY,
    ...services.map(name => readEnv(path.join(root, 'apps', `${name}-service`, '.env')).INTERNAL_API_KEY)];
  const key = candidates.find(value => value && value.length >= 32 && !value.includes('change-me'))
    || randomBytes(32).toString('hex');
  saveEnvValue(path.join(root, '.env'), 'INTERNAL_API_KEY', key);
  defaults.INTERNAL_API_KEY = key;
  for (const name of services) {
    const file = path.join(root, 'apps', `${name}-service`, '.env');
    const local = readEnv(file);
    if (local.INTERNAL_API_KEY !== undefined && local.INTERNAL_API_KEY !== key) {
      saveEnvValue(file, 'INTERNAL_API_KEY', key);
    }
  }
  const gateway = path.join(root, 'apps/gateway/.env');
  if (readEnv(gateway).INTERNAL_API_KEY !== undefined) saveEnvValue(gateway, 'INTERNAL_API_KEY', key);
  console.log('Local internal API key aligned across services (not displayed)');
}

function decryptCheck(token, key, connectionId, workspaceId) {
  const [iv, tag, ciphertext] = token.slice('enc:v1:'.length).split(':');
  const cipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'base64'), Buffer.from(iv, 'base64'));
  cipher.setAAD(Buffer.from(`${workspaceId}:${connectionId}`));
  cipher.setAuthTag(Buffer.from(tag, 'base64'));
  Buffer.concat([cipher.update(Buffer.from(ciphertext, 'base64')), cipher.final()]);
}

async function main() {
  alignLocalInternalKey();
  fs.writeFileSync(log, 'Local development migration verification\n');
  for (const name of services) {
    const directory = path.join(root, 'apps', `${name}-service`);
    const envFile = path.join(directory, '.env');
    const local = readEnv(envFile);
    const env = { ...defaults, ...local, ...process.env };
    const url = new URL(env.DATABASE_URL || '');
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      throw new Error(`${name}: setup is restricted to local PostgreSQL`);
    }
    const database = decodeURIComponent(url.pathname.slice(1));
    if (!/^expense_tracker_[a-z_]+$/.test(database)) throw new Error(`${name}: unexpected database name`);
    const adminUrl = new URL(url);
    adminUrl.pathname = '/postgres';
    const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
    try {
      const rows = await admin.$queryRawUnsafe('SELECT datname FROM pg_database WHERE datname = $1', database);
      if (!rows.length) await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
    } finally { await admin.$disconnect(); }
    const schema = path.join(directory, 'prisma', 'schema.prisma');
    for (const args of [
      ['migrate', 'deploy', '--schema', schema],
      ['migrate', 'status', '--schema', schema],
      ['migrate', 'diff', '--from-schema-datasource', schema, '--to-schema-datamodel', schema, '--exit-code'],
    ]) {
      const result = spawnSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), ...args], {
        cwd: directory, env, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
      });
      fs.appendFileSync(log, `${name}: ${args[1]}\n${result.stdout || ''}${result.stderr || ''}`);
      if (result.status !== 0) throw new Error(`${name}: ${args[1]} failed; diagnostics in ${log}`);
    }
    if (name === 'bank-feed') {
      const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
      try {
        const tokens = await db.$queryRawUnsafe('SELECT id, workspace_id, access_token FROM bank_feed_sync.bank_connection WHERE access_token LIKE \'enc:v1:%\'');
        let key = env.BANK_FEED_TOKEN_ENCRYPTION_KEY;
        if (!key || Buffer.from(key, 'base64').length !== 32) {
          if (tokens.length) {
            key = readEnv(path.join(root, '.env.docker-smoke')).BANK_FEED_TOKEN_ENCRYPTION_KEY;
            if (!key || Buffer.from(key, 'base64').length !== 32) throw new Error('Existing encrypted bank tokens require their original key');
            try { for (const row of tokens) decryptCheck(row.access_token, key, row.id, row.workspace_id); }
            catch { throw new Error('Existing encrypted bank tokens do not match the available key; original key required'); }
          } else { key = randomBytes(32).toString('base64'); }
          const text = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
          const line = `BANK_FEED_TOKEN_ENCRYPTION_KEY=${key}`;
          fs.writeFileSync(envFile, /^BANK_FEED_TOKEN_ENCRYPTION_KEY=.*$/m.test(text)
            ? text.replace(/^BANK_FEED_TOKEN_ENCRYPTION_KEY=.*$/m, line) : `${text.trimEnd()}\n${line}\n`);
          console.log('bank-feed: valid encryption key saved locally (not displayed)');
        } else {
          for (const row of tokens) decryptCheck(row.access_token, key, row.id, row.workspace_id);
        }
      } finally { await db.$disconnect(); }
    }
    console.log(`${name}: migrations current, no schema drift`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
