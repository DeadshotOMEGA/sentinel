ALTER TABLE "members"
ADD COLUMN "member_source" VARCHAR(30) NOT NULL DEFAULT 'nominal_roll';

CREATE INDEX "idx_members_member_source" ON "members"("member_source");

INSERT INTO "member_types" ("code", "name", "description", "chip_variant", "chip_color")
VALUES (
  'civilian_staff',
  'Civilian Staff',
  'Civilian museum staff who need member-style badge access without nominal roll management.',
  'light',
  'info'
)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "ranks" ("code", "name", "branch", "category", "display_order", "is_active", "replaced_by")
VALUES ('CIV', 'Civilian', 'civilian', 'civilian', 0, true, NULL)
ON CONFLICT ("code") DO NOTHING;
