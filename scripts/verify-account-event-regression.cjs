// Fresh isolated databases only. Never resets the running smoke databases.
const assert = require('node:assert/strict');
const { readFileSync, writeFileSync, appendFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const config = require('dotenv').parse(readFileSync('.env.docker-smoke'));
const {
  PrismaClient,
} = require('../apps/audit-compliance-service/node_modules/.prisma/client-audit');
const base = `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:15432/`;
const admin = new PrismaClient({
  datasources: { db: { url: base + 'postgres' } },
});
const created = [],
  results = [],
  runId = Date.now();
const notificationOnly = process.argv.includes('--notification-only');
const prefix = notificationOnly
  ? 'account-notification-regression'
  : 'account-event-regression';
const log = `${prefix}.log`;
writeFileSync(log, `Account contract regression ${new Date().toISOString()}\n`);
function run(label, args, env) {
  const r = spawnSync(process.execPath, args, {
    env,
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
  });
  appendFileSync(log, `\n${label}\n${r.stdout || ''}${r.stderr || ''}`);
  const count = (r.stdout || '').match(/Tests\s+(\d+) passed/);
  results.push({
    label,
    passed: r.status === 0,
    tests: count ? Number(count[1]) : undefined,
  });
  console.log(`${label}: ${r.status === 0 ? 'PASS' : 'FAIL'}`);
  assert.equal(r.status, 0, `${label} failed; inspect ${log}`);
}
async function main() {
  try {
    for (const [service, variable, suffix] of [
      ['audit-compliance-service', 'AUDIT_DATABASE_URL', 'audit'],
      [
        'notification-service',
        'NOTIFICATION_TEST_DATABASE_URL',
        'notification',
      ],
      ['identity-access-service', 'IDENTITY_DATABASE_URL', 'identity'],
    ]) {
      if (notificationOnly && service !== 'notification-service') continue;
      const name = `codex_test_account_${suffix}_${runId}`;
      await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
      created.push(name);
      const url = base + name;
      const env = {
        ...process.env,
        DATABASE_URL: url,
        [variable]: url,
        NODE_ENV: 'test',
        JWT_SECRET: 'account-contract-regression-signing-secret',
        INTERNAL_API_KEY: 'account-contract-internal-key',
        RESEND_API_KEY: '',
        NOTIFICATION_EMAIL_FROM: '',
        NOTIFICATION_EMAIL_PROVIDER: 'resend',
        BCRYPT_ROUNDS: '4',
      };
      const schema = `apps/${service}/prisma/schema.prisma`;
      for (const [label, args] of [
        ['validate', ['validate', '--schema', schema]],
        ['migrate', ['migrate', 'deploy', '--schema', schema]],
        ['repeat migrate', ['migrate', 'deploy', '--schema', schema]],
        ['status', ['migrate', 'status', '--schema', schema]],
        [
          'drift',
          [
            'migrate',
            'diff',
            '--from-schema-datasource',
            schema,
            '--to-schema-datamodel',
            schema,
            '--exit-code',
          ],
        ],
      ])
        run(
          `${service} ${label}`,
          ['node_modules/prisma/build/index.js', ...args],
          env
        );
      run(
        service,
        [
          'node_modules/vitest/vitest.mjs',
          'run',
          '--root',
          `apps/${service}`,
          '--config',
          'vitest.config.ts',
          '--pool',
          'forks',
          '--poolOptions.forks.singleFork',
        ],
        env
      );
    }
    const env = {
      ...process.env,
      RESEND_API_KEY: '',
      NOTIFICATION_EMAIL_FROM: '',
      NODE_ENV: 'test',
    };
    if (!notificationOnly) {
      run(
        'gateway',
        [
          'node_modules/vitest/vitest.mjs',
          'run',
          '--root',
          'apps/gateway',
          '--config',
          'vitest.config.ts',
        ],
        env
      );
      run(
        'shared packages',
        [
          'node_modules/vitest/vitest.mjs',
          'run',
          '--config',
          'packages/vitest.config.ts',
        ],
        env
      );
    }
  } finally {
    for (const name of created.reverse()) {
      assert.match(
        name,
        new RegExp(
          `^codex_test_account_(audit|notification|identity)_${runId}$`
        )
      );
      await admin.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
    }
    await admin.$disconnect();
    writeFileSync(`${prefix}-results.json`, JSON.stringify(results, null, 2));
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
