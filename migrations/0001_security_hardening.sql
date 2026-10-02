CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Apply before deploying the hardened tracking endpoint.
ALTER TABLE cases ADD COLUMN IF NOT EXISTS tracking_token TEXT;
UPDATE cases SET tracking_token = encode(gen_random_bytes(32), 'hex') WHERE tracking_token IS NULL;
ALTER TABLE cases ALTER COLUMN tracking_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cases_tracking_token_unique ON cases (tracking_token);
CREATE UNIQUE INDEX IF NOT EXISTS cases_case_number_unique ON cases (case_number);
CREATE UNIQUE INDEX IF NOT EXISTS tickets_ticket_number_unique ON tickets (ticket_number);
