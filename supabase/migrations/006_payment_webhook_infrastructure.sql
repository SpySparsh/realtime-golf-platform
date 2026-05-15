-- =============================================================================
-- PAYMENT WEBHOOK INFRASTRUCTURE
-- Durable provider event inbox, idempotency, replay guard state and reconciliation.
-- =============================================================================

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_customer_id
  ON subscriptions(razorpay_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_subscription_id
  ON subscriptions(razorpay_subscription_id);

CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider              TEXT NOT NULL,
    provider_event_id     TEXT NOT NULL,
    event_type            TEXT NOT NULL,
    event_created_at      TIMESTAMPTZ NOT NULL,
    received_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    signature_sha256      TEXT NOT NULL,
    payload               JSONB NOT NULL,
    status                TEXT NOT NULL DEFAULT 'received'
                          CHECK (status IN ('received', 'queued', 'processing', 'processed', 'ignored', 'failed')),
    processing_attempts   INTEGER NOT NULL DEFAULT 0,
    locked_at             TIMESTAMPTZ,
    processed_at          TIMESTAMPTZ,
    last_error            TEXT,
    reconciliation_id     UUID,
    metadata              JSONB NOT NULL DEFAULT '{}'::JSONB,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (provider, provider_event_id),
    UNIQUE (provider, signature_sha256)
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_provider_status
  ON payment_webhook_events(provider, status);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_created_at
  ON payment_webhook_events(event_created_at DESC);

CREATE TRIGGER payment_webhook_events_updated_at
    BEFORE UPDATE ON payment_webhook_events
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE IF NOT EXISTS payment_reconciliations (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider              TEXT NOT NULL,
    provider_payment_id   TEXT,
    provider_order_id     TEXT,
    provider_subscription_id TEXT,
    provider_event_id     TEXT NOT NULL,
    subscription_id       UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    user_id               UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status                TEXT NOT NULL CHECK (status IN ('paid', 'failed', 'refunded', 'ignored')),
    amount                INTEGER,
    currency              TEXT,
    reconciled_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_payload           JSONB NOT NULL DEFAULT '{}'::JSONB,
    metadata              JSONB NOT NULL DEFAULT '{}'::JSONB,

    UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_reconciliations_payment_id
  ON payment_reconciliations(provider, provider_payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_reconciliations_subscription_id
  ON payment_reconciliations(subscription_id);

ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment webhook events"
    ON payment_webhook_events FOR SELECT USING (is_admin());

CREATE POLICY "Service can manage payment webhook events"
    ON payment_webhook_events FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Admins can view payment reconciliations"
    ON payment_reconciliations FOR SELECT USING (is_admin());

CREATE POLICY "Service can manage payment reconciliations"
    ON payment_reconciliations FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE OR REPLACE FUNCTION claim_payment_webhook_event(p_event_id UUID)
RETURNS payment_webhook_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed payment_webhook_events;
BEGIN
  UPDATE payment_webhook_events
  SET
    status = 'processing',
    locked_at = NOW(),
    processing_attempts = processing_attempts + 1,
    updated_at = NOW()
  WHERE id = p_event_id
    AND status IN ('received', 'queued', 'failed')
  RETURNING * INTO claimed;

  RETURN claimed;
END;
$$;
