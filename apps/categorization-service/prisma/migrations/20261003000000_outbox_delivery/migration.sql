ALTER TABLE categorization_rules.outbox_event
  ADD COLUMN delivered_to TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN lease_expires_at TIMESTAMP(3),
  ADD COLUMN lease_token TEXT,
  ADD COLUMN next_attempt_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Leases created by the previous worker have no recoverable ownership metadata.
UPDATE categorization_rules.outbox_event SET status = 'PENDING'
WHERE status = 'PROCESSING';
