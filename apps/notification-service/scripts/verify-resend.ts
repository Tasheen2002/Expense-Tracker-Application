import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'dotenv';
import { ResendEmailProvider } from '../src/modules/notification-dispatch/infrastructure/adapters/resend-email.provider';

// Explicit opt-in; never starts polling workers or sends queued local notifications.
async function main() {
  const recipient = process.env.RESEND_TEST_RECIPIENT;
  assert(recipient && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient), 'RESEND_TEST_RECIPIENT is required');
  assert.equal(process.env.ALLOW_LIVE_EMAIL_TEST, 'true', 'Explicit live email test opt-in is required');
  const config = parse(readFileSync(new URL('../.env', import.meta.url)));
  assert(config.RESEND_API_KEY && config.NOTIFICATION_EMAIL_FROM, 'Configure Resend locally first');
  const requestId = randomUUID();
  const message = { idempotencyKey: requestId, recipientId: randomUUID(), recipientEmail: recipient,
    senderEmail: config.NOTIFICATION_EMAIL_FROM, subject: 'Expense Tracker — live email verification',
    content: '<p>This is the single authorized Resend test from your Expense Tracker Notification Service.</p>'
      + '<p>If you received this message, external email delivery is working.</p>' };
  const report = join(tmpdir(), `expense-tracker-resend-${requestId}.json`);
  // Retain the original request identity if the outcome is uncertain; no blind resend.
  writeFileSync(report, JSON.stringify({ requestId, message, outcome: 'started' }, null, 2));
  const provider = new ResendEmailProvider(config.RESEND_API_KEY, config.NOTIFICATION_EMAIL_FROM);
  const result = await provider.send(message);
  writeFileSync(report, JSON.stringify({ requestId, message, result }, null, 2));
  console.log(JSON.stringify({ requestId, recipient, result, report }, null, 2));
  if (!result.success) { process.exitCode = 1; return; }
  const replay = await provider.send(message);
  writeFileSync(report, JSON.stringify({ requestId, message, result, replay }, null, 2));
  assert(replay.success && replay.messageId === result.messageId, 'Provider replay did not reuse the accepted email ID');
  console.log('Idempotency verified: identical replay returned the same email ID.');
  console.log('Provider acceptance verified; inbox delivery must be confirmed by the recipient.');
}

main().catch(() => { console.error('Live email verification failed; credentials omitted.'); process.exitCode = 1; });
