-- Seed script for Unit Event Types
-- Run after unit_event_types table has been created

INSERT INTO unit_event_types (id, name, category, default_duration_minutes, requires_duty_watch, default_metadata, display_order, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Change of Command', 'ceremonial', 180, true,
    '{"dressCode": "Service Dress", "requiresBand": true, "requiresHonorGuard": true, "requiresRehearsal": true}'::jsonb,
    1, now(), now()),

  (gen_random_uuid(), 'Annual Mess Dinner', 'mess_dinner', 240, true,
    '{"dressCode": "Mess Dress", "seatingArrangement": true}'::jsonb,
    2, now(), now()),

  (gen_random_uuid(), 'Training Night', 'training', 180, true,
    null,
    3, now(), now()),

  (gen_random_uuid(), 'VIP Visit', 'vip_visit', 120, true,
    '{"vipParking": true, "escortRequired": true}'::jsonb,
    4, now(), now()),

  (gen_random_uuid(), 'Remembrance Day', 'remembrance', 180, true,
    '{"dressCode": "Service Dress with medals"}'::jsonb,
    5, now(), now()),

  (gen_random_uuid(), 'Social Event', 'social', 180, false,
    null,
    6, now(), now()),

  (gen_random_uuid(), 'General Event', 'other', 120, false,
    null,
    7, now(), now())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Unit Event Types:' as info;
SELECT name, category, default_duration_minutes, requires_duty_watch, display_order
FROM unit_event_types
ORDER BY display_order;
