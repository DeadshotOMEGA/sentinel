-- Seed script for Duty Roles & Lockup System
-- Run after duty roles tables have been created

-- ============================================================================
-- QUALIFICATION TYPES
-- ============================================================================

INSERT INTO qualification_types (id, code, name, description, can_receive_lockup, display_order, created_at, updated_at)
VALUES
  -- Lockup-eligible qualifications (can_receive_lockup = true)
  (gen_random_uuid(), 'DDS', 'DDS Qualified', 'Trained to serve as Duty Day Staff', true, 1, now(), now()),
  (gen_random_uuid(), 'SWK', 'SWK Qualified', 'Trained to serve as Senior Watchkeeper', true, 2, now(), now()),
  (gen_random_uuid(), 'BUILDING_AUTH', 'Building Authorized', 'Has alarm codes and building access', true, 3, now(), now()),

  -- Non-lockup qualifications (tracked for other purposes)
  (gen_random_uuid(), 'VAULT_KEY', 'Vault Key Holder', 'Has physical key to the vault', false, 4, now(), now()),
  (gen_random_uuid(), 'VAULT_CODE', 'Vault Code Holder', 'Knows the vault combination', false, 5, now(), now()),
  (gen_random_uuid(), 'FM', 'Facility Manager', 'Facility Manager responsibilities', false, 6, now(), now()),
  (gen_random_uuid(), 'ISA', 'ISA', 'Unit Security Authority responsibilities', false, 7, now(), now())
ON CONFLICT (code) DO NOTHING;

-- Mark existing types as manual (in case is_automatic column was added after initial seed)
UPDATE qualification_types SET is_automatic = false WHERE is_automatic IS NULL;

-- Duty Watch position qualifications (auto-granted based on rank/division)
INSERT INTO qualification_types (id, code, name, description, can_receive_lockup, is_automatic, display_order, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'APS', 'APS Qualified', 'Access Point Sentry (auto: S3 not in BMQ)', false, true, 10, now(), now()),
  (gen_random_uuid(), 'BM', 'BM Qualified', 'Bosn Mate (auto: S2)', false, true, 11, now(), now()),
  (gen_random_uuid(), 'QM', 'QM Qualified', 'Quartermaster (auto: S1)', false, true, 12, now(), now()),
  (gen_random_uuid(), 'DSWK', 'DSWK Qualified', 'Deputy Senior Watchkeeper (auto: MS-Lt(N) without SWK)', false, true, 13, now(), now())
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- DUTY ROLES
-- ============================================================================

INSERT INTO duty_roles (id, code, name, description, role_type, schedule_type, active_days, display_order, created_at, updated_at)
VALUES
  -- DDS: Duty Day Staff - single person, weekly, active all days
  (gen_random_uuid(), 'DDS', 'Duty Day Staff', 'Single person responsible for daily operations Monday through Sunday', 'single', 'weekly', ARRAY[1,2,3,4,5,6,7], 1, now(), now()),

  -- DUTY_WATCH: Duty Watch Team - team of 6, weekly, active only Tue/Thu
  (gen_random_uuid(), 'DUTY_WATCH', 'Duty Watch', 'Evening team responsible for security on Tuesday and Thursday nights', 'team', 'weekly', ARRAY[2,4], 2, now(), now())
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- DUTY POSITIONS (for Duty Watch team)
-- ============================================================================

-- Get the DUTY_WATCH role ID for foreign key
DO $$
DECLARE
  duty_watch_id uuid;
BEGIN
  SELECT id INTO duty_watch_id FROM duty_roles WHERE code = 'DUTY_WATCH';

  -- Insert positions only if duty_watch_id exists
  IF duty_watch_id IS NOT NULL THEN
    INSERT INTO duty_positions (id, duty_role_id, code, name, description, max_slots, display_order, created_at, updated_at)
    VALUES
      (gen_random_uuid(), duty_watch_id, 'SWK', 'Senior Watchkeeper', 'Team leader, takes Lockup responsibility', 1, 1, now(), now()),
      (gen_random_uuid(), duty_watch_id, 'DSWK', 'Deputy Senior Watchkeeper', 'Backup to SWK', 1, 2, now(), now()),
      (gen_random_uuid(), duty_watch_id, 'QM', 'Quartermaster', 'Watch duties', 1, 3, now(), now()),
      (gen_random_uuid(), duty_watch_id, 'BM', 'Bos''n Mate', 'Watch duties', 1, 4, now(), now()),
      (gen_random_uuid(), duty_watch_id, 'APS', 'Access Point Sentry', 'Two positions for access control', 2, 5, now(), now())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- LOCKUP SETTINGS
-- ============================================================================

INSERT INTO settings (id, key, value, category, description, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'lockup_settings',
  '{
    "dayRolloverTime": "03:00",
    "timezone": "America/Winnipeg",
    "dutyWatchStartTime": "19:00",
    "lockupNotExecutedWarningTime": "22:00",
    "lockupNotExecutedCriticalTime": "23:00",
    "trackMissedCheckouts": true,
    "missedCheckoutWarningThreshold": 3,
    "missedCheckoutAlertThreshold": 5
  }'::jsonb,
  'operations',
  'Configuration for lockup system including timezone, alert times, and missed checkout tracking',
  now(),
  now()
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Display what was seeded
SELECT 'Qualification Types:' as info;
SELECT code, name, can_receive_lockup, display_order FROM qualification_types ORDER BY display_order;

SELECT 'Duty Roles:' as info;
SELECT code, name, role_type, active_days, display_order FROM duty_roles ORDER BY display_order;

SELECT 'Duty Positions:' as info;
SELECT dp.code, dp.name, dp.max_slots, dr.code as role_code
FROM duty_positions dp
JOIN duty_roles dr ON dp.duty_role_id = dr.id
ORDER BY dr.display_order, dp.display_order;
