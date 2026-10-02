import { buildExpenseApp } from '../src/app';

async function main(): Promise<void> {
  const app = await buildExpenseApp({ enableInternalAuth: false, logger: false });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Expense test server did not bind to a TCP port');
  }
  process.stdout.write(`EXPENSE_TEST_URL=http://127.0.0.1:${address.port}\n`);

  process.on('SIGTERM', () => {
    void app.close().finally(() => process.exit());
  });
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
