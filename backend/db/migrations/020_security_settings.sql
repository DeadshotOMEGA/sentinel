-- Migration: 020_security_settings.sql
-- Description: Add user account management fields and migrate roles
-- Date: 2026-01-15

-- Drop constraint if it exists from previous failed run
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;

-- Add tracking fields for account management (IF NOT EXISTS to handle reruns)
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS disabled BOOLEAN DEFAULT FALSE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP(6);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS disabled_by UUID REFERENCES admin_users(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES admin_users(id) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Create index for disabled field (performance for filtering active users)
CREATE INDEX IF NOT EXISTS idx_admin_users_disabled ON admin_users(disabled);

-- Migrate existing roles to new role hierarchy
-- readonly → quartermaster (standard users, no Settings/Logs)
-- admin → developer (full access including Dev Tools)
-- coxswain → admin (Settings access except Dev Tools)
UPDATE admin_users SET role = 'quartermaster' WHERE role = 'readonly';
UPDATE admin_users SET role = 'developer' WHERE role = 'admin';
UPDATE admin_users SET role = 'admin' WHERE role = 'coxswain';

-- Add constraint to enforce new role values
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('quartermaster', 'admin', 'developer'));

-- Update comments for clarity
COMMENT ON COLUMN admin_users.role IS 'User role: quartermaster (standard), admin (settings access), developer (full access)';
COMMENT ON COLUMN admin_users.disabled IS 'Whether the account is disabled (soft delete)';
COMMENT ON COLUMN admin_users.disabled_at IS 'Timestamp when account was disabled';
COMMENT ON COLUMN admin_users.disabled_by IS 'Admin who disabled this account';
COMMENT ON COLUMN admin_users.updated_by IS 'Admin who last updated this account';
