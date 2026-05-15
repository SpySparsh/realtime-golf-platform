-- =============================================================================
-- AUTH AUDIT LOGS
-- Append-only audit trail for authentication and session events.
-- =============================================================================

CREATE TABLE IF NOT EXISTS auth_audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type  TEXT NOT NULL,
    user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
    email       TEXT,
    ip_address  TEXT,
    user_agent  TEXT,
    success     BOOLEAN NOT NULL DEFAULT FALSE,
    metadata    JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_id ON auth_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_event_type ON auth_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_created_at ON auth_audit_logs(created_at DESC);

ALTER TABLE auth_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view auth audit logs"
    ON auth_audit_logs FOR SELECT USING (is_admin());

CREATE POLICY "Authenticated service can insert auth audit logs"
    ON auth_audit_logs FOR INSERT WITH CHECK (TRUE);

