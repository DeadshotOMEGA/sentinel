-- Migration: Training Years table for September-May training year cycle
-- Supports enhanced reporting with configurable training periods and holiday exclusions

-- Training Years table
CREATE TABLE training_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,           -- e.g., "2024-2025"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  holiday_exclusions JSONB DEFAULT '[]', -- Array of {start, end, name}
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_training_years_start_date ON training_years(start_date);
CREATE INDEX idx_training_years_is_current ON training_years(is_current);

-- Trigger to ensure only one training year is current
CREATE OR REPLACE FUNCTION ensure_single_current_training_year()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE training_years SET is_current = false WHERE id != NEW.id AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER training_year_current_trigger
BEFORE INSERT OR UPDATE ON training_years
FOR EACH ROW EXECUTE FUNCTION ensure_single_current_training_year();

-- Auto-update timestamp trigger
CREATE TRIGGER update_training_years_updated_at BEFORE UPDATE ON training_years
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table comments
COMMENT ON TABLE training_years IS 'Training year periods (September-May cycle) for attendance reporting';
COMMENT ON COLUMN training_years.name IS 'Display name for training year, e.g., "2024-2025"';
COMMENT ON COLUMN training_years.holiday_exclusions IS 'Array of holiday periods to exclude from attendance calculations: [{start: "2024-12-20", end: "2025-01-05", name: "Winter Break"}]';
COMMENT ON COLUMN training_years.is_current IS 'Only one training year can be current at a time (enforced by trigger)';
