-- Migration: 018_security_alerts
-- Description: Add security_alerts table for tracking badge scan alerts (disabled/unknown badges)
-- Created: 2026-01-14

-- Security alerts table for tracking badge-related security events
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,           -- badge_disabled, badge_unknown, inactive_member
    severity VARCHAR(20) NOT NULL,             -- critical, warning, info
    badge_serial VARCHAR(100),                 -- The badge serial that triggered the alert
    member_id UUID,                            -- Related member if applicable
    kiosk_id VARCHAR(50) NOT NULL,             -- Which kiosk generated the alert
    message TEXT NOT NULL,                     -- Human-readable alert message
    details JSONB,                             -- Additional context (badge status, member info, etc.)
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, acknowledged, dismissed
    acknowledged_by UUID,                      -- Admin who acknowledged the alert
    acknowledged_at TIMESTAMP(6),              -- When the alert was acknowledged
    acknowledge_note TEXT,                     -- Note from admin when acknowledging
    created_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),

    -- Foreign keys
    CONSTRAINT fk_security_alerts_acknowledged_by
        FOREIGN KEY (acknowledged_by) REFERENCES admin_users(id) ON UPDATE NO ACTION
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created ON security_alerts(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE security_alerts IS 'Tracks security-related alerts from kiosk badge scans';
COMMENT ON COLUMN security_alerts.alert_type IS 'Type of alert: badge_disabled, badge_unknown, inactive_member';
COMMENT ON COLUMN security_alerts.severity IS 'Alert severity: critical (red), warning (yellow), info (blue)';
COMMENT ON COLUMN security_alerts.status IS 'Alert lifecycle: active -> acknowledged -> dismissed';
