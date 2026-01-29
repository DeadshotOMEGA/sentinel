-- Seed temporary test badges and assign to members
-- Creates one badge per member with serial numbers TEST-BADGE-0001 through TEST-BADGE-0160

DO $$
DECLARE
  member_rec RECORD;
  badge_counter INT := 1;
  new_badge_id UUID;
  active_status_id UUID;
  serial TEXT;
BEGIN
  -- Get the active badge status ID
  SELECT id INTO active_status_id FROM badge_statuses WHERE code = 'active';

  IF active_status_id IS NULL THEN
    RAISE EXCEPTION 'Badge status "active" not found. Seed badge_statuses first.';
  END IF;

  -- Loop through all members ordered by last name
  FOR member_rec IN
    SELECT id, first_name, last_name
    FROM members
    ORDER BY last_name, first_name
  LOOP
    serial := 'TEST-BADGE-' || LPAD(badge_counter::TEXT, 4, '0');

    -- Insert badge
    INSERT INTO badges (id, serial_number, assignment_type, assigned_to_id, status, badge_status_id, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      serial,
      'permanent',
      member_rec.id,
      'active',
      active_status_id,
      NOW(),
      NOW()
    )
    ON CONFLICT (serial_number) DO NOTHING
    RETURNING id INTO new_badge_id;

    -- If badge was inserted (not a conflict), assign it to the member
    IF new_badge_id IS NOT NULL THEN
      UPDATE members SET badge_id = new_badge_id, updated_at = NOW()
      WHERE id = member_rec.id;
    END IF;

    badge_counter := badge_counter + 1;
  END LOOP;

  RAISE NOTICE 'Seeded % badges and assigned to members', badge_counter - 1;
END $$;
