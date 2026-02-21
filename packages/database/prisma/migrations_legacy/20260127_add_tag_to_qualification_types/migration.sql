-- Migration: Add tag_id FK to qualification_types
-- This allows QualificationType to optionally link to a Tag for visual styling

-- Step 1: Add nullable tag_id column to qualification_types
ALTER TABLE qualification_types
ADD COLUMN IF NOT EXISTS tag_id UUID;

-- Step 2: Add foreign key constraint with SET NULL on delete
ALTER TABLE qualification_types
ADD CONSTRAINT fk_qualification_types_tag
FOREIGN KEY (tag_id) REFERENCES tags(id)
ON DELETE SET NULL
ON UPDATE NO ACTION;

-- Step 3: Add index for the FK column
CREATE INDEX IF NOT EXISTS idx_qualification_types_tag
ON qualification_types(tag_id);
