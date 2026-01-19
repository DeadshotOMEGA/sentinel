-- Migration: 019_dds_tables
-- Description: Add DDS (Duty Day Staff) assignment tables and responsibility audit log
-- Created: 2026-01-14

-- DDS assignments table for tracking daily duty day staff
CREATE TABLE IF NOT EXISTS dds_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL,
    assigned_date DATE NOT NULL,
    accepted_at TIMESTAMP(6),
    released_at TIMESTAMP(6),
    transferred_to UUID,                         -- Member ID if DDS was transferred
    assigned_by UUID,                            -- Admin who assigned (null if self-accepted)
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, active, released, transferred
    notes TEXT,
    created_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),

    -- Foreign keys
    CONSTRAINT fk_dds_assignments_member
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT fk_dds_assignments_transferred_to
        FOREIGN KEY (transferred_to) REFERENCES members(id) ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT fk_dds_assignments_assigned_by
        FOREIGN KEY (assigned_by) REFERENCES admin_users(id) ON DELETE SET NULL ON UPDATE NO ACTION
);

-- Responsibility audit log for tracking DDS and Lockup tag changes
CREATE TABLE IF NOT EXISTS responsibility_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL,
    tag_name VARCHAR(50) NOT NULL,               -- 'DDS' or 'Lockup'
    action VARCHAR(50) NOT NULL,                 -- assigned, transferred, released, self_accepted
    from_member_id UUID,                         -- Previous holder (for transfers)
    to_member_id UUID,                           -- New holder (for transfers)
    performed_by UUID,                           -- Admin or member who performed action
    performed_by_type VARCHAR(20) NOT NULL,      -- 'admin' or 'member'
    timestamp TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    notes TEXT,

    -- Foreign keys
    CONSTRAINT fk_responsibility_audit_member
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT fk_responsibility_audit_from_member
        FOREIGN KEY (from_member_id) REFERENCES members(id) ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT fk_responsibility_audit_to_member
        FOREIGN KEY (to_member_id) REFERENCES members(id) ON DELETE SET NULL ON UPDATE NO ACTION
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_dds_assignments_member ON dds_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_dds_assignments_date ON dds_assignments(assigned_date);
CREATE INDEX IF NOT EXISTS idx_dds_assignments_status ON dds_assignments(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dds_assignments_active_date ON dds_assignments(assigned_date)
    WHERE status IN ('pending', 'active');

CREATE INDEX IF NOT EXISTS idx_responsibility_audit_member ON responsibility_audit_log(member_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_audit_tag ON responsibility_audit_log(tag_name);
CREATE INDEX IF NOT EXISTS idx_responsibility_audit_timestamp ON responsibility_audit_log(timestamp DESC);

-- Comments for documentation
COMMENT ON TABLE dds_assignments IS 'Tracks daily Duty Day Staff (DDS) assignments';
COMMENT ON COLUMN dds_assignments.status IS 'Assignment lifecycle: pending -> active -> released/transferred';
COMMENT ON COLUMN dds_assignments.accepted_at IS 'When member self-accepted via kiosk';
COMMENT ON COLUMN dds_assignments.assigned_by IS 'Admin ID if assigned by admin, null if self-accepted';

COMMENT ON TABLE responsibility_audit_log IS 'Audit trail for DDS and Lockup responsibility changes';
COMMENT ON COLUMN responsibility_audit_log.tag_name IS 'Type of responsibility: DDS or Lockup';
COMMENT ON COLUMN responsibility_audit_log.action IS 'What happened: assigned, transferred, released, self_accepted';
