// A local smoke-stack restore drill; never restores over an application database.
const assert = require('node:assert/strict');
const { readFileSync, writeFileSync, chmodSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const config = require('dotenv').parse(readFileSync('.env.docker-smoke'));
const { PrismaClient } = require('../apps/receipt-vault-service/node_modules/.prisma/client-receipt-vault');
const base = `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:15432/`;
const admin = new PrismaClient({ datasources: { db: { url: base + 'postgres' } } });
const runId = `${Date.now()}_${randomUUID().replaceAll('-', '')}`;
const directory = join(tmpdir(), `expense-backup-${runId}`);
mkdirSync(directory, { mode: 0o700 });
const results = [];
const services = ['gateway', 'identity', 'approval', 'categorization', 'bank', 'expense', 'receipt', 'notification', 'audit'];
const stopped = new Set();
const restoreVolume = `expense_restore_verify_${runId}`;
let volumeCreated = false;
function docker(args) {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 120000 });
  if (result.status !== 0) throw new Error(`Backup command ${args[0]} failed`);
  return result.stdout.trim();
}
async function counts(db) {
  await db.$executeRawUnsafe("SET TIME ZONE 'UTC'");
  const tables = await db.$queryRawUnsafe(`SELECT table_schema, table_name FROM information_schema.tables
    WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema')
    ORDER BY table_schema, table_name`);
  const rows = [];
  for (const table of tables) {
    assert.match(table.table_schema, /^[a-z0-9_]+$/); assert.match(table.table_name, /^[a-z0-9_]+$/i);
    const [row] = await db.$queryRawUnsafe(`SELECT count(*)::text AS count,
      md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' ORDER BY md5(to_jsonb(t)::text)), '')) AS digest
      FROM "${table.table_schema}"."${table.table_name}" t`);
    rows.push({ table: `${table.table_schema}.${table.table_name}`, count: row.count, digest: row.digest });
  }
  return rows;
}
async function catalog(db) {
  const constraints = await db.$queryRawUnsafe(`SELECT n.nspname AS schema_name, t.relname AS table_name, c.conname AS name,
    c.contype::text AS type, c.convalidated AS validated, pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_temp_%'
    ORDER BY n.nspname,t.relname,c.conname`);
  // pg_restore reparses CHECK expressions and flattens associative AND trees.
  // Reparse both sides through PostgreSQL, preserving operators and precedence.
  for (const constraint of constraints.filter(row => row.type === 'c')) {
    const temporary = `restore_check_${randomUUID().replaceAll('-', '')}`;
    assert.match(constraint.schema_name, /^[a-z0-9_]+$/);
    assert.match(constraint.table_name, /^[a-z0-9_]+$/i);
    await db.$executeRawUnsafe(`CREATE TEMP TABLE "${temporary}" (LIKE "${constraint.schema_name}"."${constraint.table_name}")`);
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "${temporary}" ADD CONSTRAINT restore_check ${constraint.definition}`);
      const [canonical] = await db.$queryRawUnsafe(`SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint
        WHERE conrelid='pg_temp.${temporary}'::regclass AND conname='restore_check'`);
      constraint.definition = canonical.definition;
    } finally { await db.$executeRawUnsafe(`DROP TABLE "${temporary}"`); }
  }
  const indexes = await db.$queryRawUnsafe(`SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes
    WHERE schemaname NOT IN ('pg_catalog','information_schema') AND schemaname NOT LIKE 'pg_temp_%'
    ORDER BY schemaname,tablename,indexname`);
  return { constraints, indexes };
}
async function seedReceipt() {
  const post = async (path, body, token, status = 201) => {
    const response = await fetch('http://127.0.0.1:13001' + path, { method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, status, `Restore fixture ${path}`);
    return (await response.json()).data;
  };
  const email = `restore-${randomUUID()}@example.test`, password = `Restore-${randomUUID()}!`;
  await post('/api/v1/auth/register', { email, password, fullName: 'Restore verification' });
  const login = await post('/api/v1/auth/login', { email, password }, undefined, 200);
  const workspace = await post('/api/v1/workspaces', { name: `Restore ${runId.slice(0, 13)}` }, login.token);
  const bytes = Buffer.from(`%PDF-1.7\nRestore fixture ${randomUUID()}`);
  const receipt = await post(`/api/v1/workspaces/${workspace.workspaceId}/receipts/upload`, {
    originalName: 'restore.pdf', mimeType: 'application/pdf', fileContent: bytes.toString('base64'),
  }, login.token);
  return receipt.receiptId;
}
function copyReceiptFiles() {
  const image = 'expense-smoke-receipt-vault-service';
  docker(['run', '--rm', '--network', 'none', '--user', '0', '--volumes-from', 'expense_smoke_receipt:ro',
    '--mount', `type=bind,source=${directory},target=/backup`, '--entrypoint', 'node', image, '-e',
    "const fs=require('fs');fs.cpSync('/app/uploads','/backup/receipt-files',{recursive:true});"]);
  docker(['volume', 'create', restoreVolume]); volumeCreated = true;
  docker(['run', '--rm', '--network', 'none', '--user', '0', '--mount', `type=bind,source=${directory},target=/backup,readonly`,
    '--mount', `type=volume,source=${restoreVolume},target=/restore`, '--entrypoint', 'node', image, '-e',
    "const fs=require('fs'),p=require('path');fs.cpSync('/backup/receipt-files','/restore',{recursive:true});function own(d){const s=fs.lstatSync(d);if(s.isSymbolicLink()||(!s.isDirectory()&&!s.isFile()))throw new Error('Nonregular restore object');fs.chownSync(d,1000,1000);if(s.isDirectory()){fs.chmodSync(d,0o700);for(const n of fs.readdirSync(d))own(p.join(d,n));}else fs.chmodSync(d,0o600);}own('/restore');"]);
  const inventory = root => `const fs=require('fs'),p=require('path'),c=require('crypto'),rows=[];function walk(d){for(const n of fs.readdirSync(d).sort()){const f=p.join(d,n),s=fs.lstatSync(f);if(s.isDirectory())walk(f);else{if(!s.isFile()||s.isSymbolicLink())throw new Error('Nonregular storage object');rows.push({key:p.relative('${root}',f),size:s.size,sha256:c.createHash('sha256').update(fs.readFileSync(f)).digest('hex')});}}}walk('${root}');console.log(JSON.stringify(rows));`;
  const source = JSON.parse(docker(['run', '--rm', '--network', 'none', '--volumes-from', 'expense_smoke_receipt:ro',
    '--entrypoint', 'node', image, '-e', inventory('/app/uploads')]));
  const restored = JSON.parse(docker(['run', '--rm', '--network', 'none', '--mount', `type=volume,source=${restoreVolume},target=/restore,readonly`,
    '--entrypoint', 'node', image, '-e', inventory('/restore')]));
  assert.deepEqual(restored, source, 'Restored file bytes differ or cannot be read by the application user');
  writeFileSync(join(directory, 'receipt-files-manifest.json'), JSON.stringify(restored, null, 2));
  return restored;
}
async function main() {
  try {
    const seededReceiptId = await seedReceipt();
    for (const service of services) {
      docker(['stop', '--time', '30', `expense_smoke_${service}`]); stopped.add(service);
      const exit = Number(docker(['inspect', '--format', '{{.State.ExitCode}}', `expense_smoke_${service}`]));
      assert.equal(exit, 0, `${service} did not shut down gracefully`);
      results.push({ service, shutdownExitCode: exit });
    }
    const files = copyReceiptFiles();
    for (const suffix of ['identity', 'expense', 'approval', 'audit', 'bank_feed', 'notification', 'categorization', 'receipt']) {
      const source = `expense_tracker_${suffix}`;
      const target = `expense_backup_verify_${runId}_${suffix}`;
      assert.match(target, /^expense_backup_verify_[0-9]+_[a-f0-9]{32}_[a-z_]+$/);
      const containerFile = `/tmp/${target}.dump`;
      const file = join(directory, `${suffix}.dump`);
      const db = new PrismaClient({ datasources: { db: { url: base + source } } });
      let created = false;
      let restored;
      try {
        const expected = await db.$transaction(async tx => {
          const [snapshot] = await tx.$queryRawUnsafe('SELECT pg_export_snapshot() AS snapshot');
          // The dump and counts share a PostgreSQL snapshot even if workers write concurrently.
          docker(['exec', 'expense_smoke_postgres', 'pg_dump', '-U', 'postgres', '-d', source,
            '--format=custom', `--snapshot=${snapshot.snapshot}`, `--file=${containerFile}`]);
          return { rows: await counts(tx), catalog: await catalog(tx) };
        }, { isolationLevel: 'RepeatableRead', timeout: 180000 });
        docker(['cp', `expense_smoke_postgres:${containerFile}`, file]); chmodSync(file, 0o600);
        await admin.$executeRawUnsafe(`CREATE DATABASE "${target}"`); created = true;
        docker(['exec', 'expense_smoke_postgres', 'pg_restore', '-U', 'postgres', '-d', target,
          '--exit-on-error', '--no-owner', containerFile]);
        restored = new PrismaClient({ datasources: { db: { url: base + target } } });
        const actual = { rows: await counts(restored), catalog: await catalog(restored) };
        assert.deepEqual(actual, expected, `${source} restored table/row counts differ from the backup snapshot`);
        if (suffix === 'receipt') {
          const references = await restored.receipt.findMany({ where: { storageProvider: 'LOCAL', deletedAt: null } });
          assert.ok(references.some(row => row.id === seededReceiptId), 'Nonempty receipt fixture must be restored');
          for (const row of references) {
            const file = files.find(file => file.key === row.storageKey);
            assert.ok(file, `Restored receipt ${row.id} lacks its file`);
            assert.equal(file.size, row.fileSize);
            assert.equal(file.sha256, row.fileHash);
          }
          results.push({ receiptFiles: files.length, verifiedReferences: references.length, restored: true });
        }
        results.push({ database: source, tables: actual.rows.length, restored: true });
        console.log(`${source}: backup data/constraints/indexes and isolated restore PASS (${actual.rows.length} tables)`);
      } finally {
        await db.$disconnect(); if (restored) await restored.$disconnect();
        if (created) await admin.$executeRawUnsafe(`DROP DATABASE "${target}" WITH (FORCE)`);
        docker(['exec', 'expense_smoke_postgres', 'rm', '-f', containerFile]);
      }
    }
  } finally {
    const cleanupErrors = [];
    if (volumeCreated) { try { docker(['volume', 'rm', restoreVolume]); } catch (error) { cleanupErrors.push(error); } }
    for (const service of [...stopped].reverse()) {
      try { docker(['start', `expense_smoke_${service}`]); } catch (error) { cleanupErrors.push(error); }
    }
    await admin.$disconnect();
    writeFileSync(join(directory, 'restore-results.json'), JSON.stringify(results, null, 2));
    console.log(`Private local backups and results: ${directory}`);
    if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'Restore drill cleanup or service restart failed');
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
