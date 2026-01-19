-- Add display_name column to admin_users
ALTER TABLE "admin_users" ADD COLUMN "display_name" VARCHAR(200);

-- Populate display_name from existing fullName
UPDATE "admin_users" SET "display_name" = "full_name";

-- Make display_name NOT NULL after populating
ALTER TABLE "admin_users" ALTER COLUMN "display_name" SET NOT NULL;

-- Make first_name and last_name nullable
ALTER TABLE "admin_users" ALTER COLUMN "first_name" DROP NOT NULL;
ALTER TABLE "admin_users" ALTER COLUMN "last_name" DROP NOT NULL;

-- Make full_name nullable since display_name is now the primary field
ALTER TABLE "admin_users" ALTER COLUMN "full_name" DROP NOT NULL;
