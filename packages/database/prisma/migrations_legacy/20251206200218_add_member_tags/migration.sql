-- CreateTable: tags
CREATE TABLE "tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable: member_tags
CREATE TABLE "member_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique tag name
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex: tags name lookup
CREATE INDEX "idx_tags_name" ON "tags"("name");

-- CreateIndex: unique member-tag combination
CREATE UNIQUE INDEX "idx_member_tags_member_tag" ON "member_tags"("member_id", "tag_id");

-- CreateIndex: member_tags member lookup
CREATE INDEX "idx_member_tags_member" ON "member_tags"("member_id");

-- CreateIndex: member_tags tag lookup
CREATE INDEX "idx_member_tags_tag" ON "member_tags"("tag_id");

-- AddForeignKey: member_tags -> members
ALTER TABLE "member_tags" ADD CONSTRAINT "member_tags_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey: member_tags -> tags
ALTER TABLE "member_tags" ADD CONSTRAINT "member_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Seed initial tags
INSERT INTO "tags" ("name", "color", "description") VALUES
    ('FTS', '#007fff', 'Full-Time Staff (Class B/C or Reg Force personnel)'),
    ('BMQ', '#10b981', 'Basic Military Qualification candidate'),
    ('qualified_driver', '#ff8000', 'Qualified driver for unit vehicles'),
    ('duty_crew', '#8b5cf6', 'Member of duty crew rotation'),
    ('instructor', '#ec4899', 'Qualified instructor'),
    ('first_aid', '#f59e0b', 'First aid qualified');

-- Auto-tag FTS members: Class B, Class C, or Reg Force with CHW mess (SRM)
INSERT INTO "member_tags" ("member_id", "tag_id")
SELECT
    m.id,
    (SELECT id FROM "tags" WHERE name = 'FTS')
FROM "members" m
WHERE
    (m.member_type IN ('class_b', 'class_c', 'reg_force'))
    AND m.mess = 'SRM'
    AND NOT EXISTS (
        SELECT 1 FROM "member_tags" mt
        WHERE mt.member_id = m.id
        AND mt.tag_id = (SELECT id FROM "tags" WHERE name = 'FTS')
    );
