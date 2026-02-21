-- Normalize checkin direction values to lowercase
-- Manual check-ins were stored as 'IN'/'OUT' but all queries expect 'in'/'out'
UPDATE checkins SET direction = LOWER(direction) WHERE direction != LOWER(direction);
