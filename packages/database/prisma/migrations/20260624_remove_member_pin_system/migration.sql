ALTER TABLE "members"
  DROP COLUMN IF EXISTS "pin_hash",
  DROP COLUMN IF EXISTS "must_change_pin";
