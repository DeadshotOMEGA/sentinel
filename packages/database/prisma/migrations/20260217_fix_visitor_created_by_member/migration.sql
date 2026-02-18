-- Fix visitors.created_by_admin FK to reference members instead of admin_users
-- The admin_users table is a legacy concept; the current auth system uses members.
ALTER TABLE visitors DROP CONSTRAINT IF EXISTS visitors_created_by_admin_fkey;
ALTER TABLE visitors ADD CONSTRAINT visitors_created_by_admin_fkey
  FOREIGN KEY (created_by_admin) REFERENCES members(id)
  ON DELETE SET NULL ON UPDATE NO ACTION;
