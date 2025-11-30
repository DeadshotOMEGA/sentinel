-- Migration 007: Add conflict resolution flags for offline sync
-- Adds flagging capability for check-ins with suspicious timestamps due to clock drift

ALTER TABLE checkins
  ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flag_reason VARCHAR(255);

-- Index for querying flagged items
CREATE INDEX IF NOT EXISTS idx_checkins_flagged ON checkins(flagged_for_review)
  WHERE flagged_for_review = TRUE;

COMMENT ON COLUMN checkins.flagged_for_review IS 'Indicates check-in has suspicious timestamp (clock drift detected)';
COMMENT ON COLUMN checkins.flag_reason IS 'Reason for flagging (e.g., "Clock drift: 15 minutes")';
