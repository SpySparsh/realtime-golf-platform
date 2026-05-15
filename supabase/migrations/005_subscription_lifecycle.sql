-- =============================================================================
-- SUBSCRIPTION LIFECYCLE
-- Adds production lifecycle states and transition audit logging.
-- =============================================================================

ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'suspended';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'payment_failed';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'grace_period';

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payment_retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payment_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lifecycle_metadata JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE TABLE IF NOT EXISTS subscription_audit_logs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id     UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    user_id             UUID REFERENCES profiles(id) ON DELETE SET NULL,
    from_status         TEXT,
    to_status           TEXT NOT NULL,
    reason              TEXT NOT NULL,
    provider_event_id   TEXT,
    metadata            JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_audit_logs_subscription_id
  ON subscription_audit_logs(subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_audit_logs_user_id
  ON subscription_audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_audit_logs_created_at
  ON subscription_audit_logs(created_at DESC);

ALTER TABLE subscription_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view subscription audit logs"
    ON subscription_audit_logs FOR SELECT USING (is_admin());

CREATE POLICY "Service can insert subscription audit logs"
    ON subscription_audit_logs FOR INSERT WITH CHECK (TRUE);

