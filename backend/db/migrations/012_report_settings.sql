-- Migration: Report Settings key-value store
-- Configurable settings for report generation (thresholds, formatting, schedule, working hours)

-- Report Settings table
CREATE TABLE report_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_report_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_settings_timestamp_trigger
BEFORE UPDATE ON report_settings
FOR EACH ROW EXECUTE FUNCTION update_report_settings_timestamp();

-- Insert default settings
INSERT INTO report_settings (key, value) VALUES
  ('schedule', '{"trainingNightDay": "tuesday", "trainingNightStart": "19:00", "trainingNightEnd": "22:10", "adminNightDay": "thursday", "adminNightStart": "19:00", "adminNightEnd": "22:10"}'),
  ('working_hours', '{"regularWeekdayStart": "08:00", "regularWeekdayEnd": "16:00", "regularWeekdays": ["monday", "wednesday", "friday"], "summerStartDate": "06-01", "summerEndDate": "08-31", "summerWeekdayStart": "09:00", "summerWeekdayEnd": "15:00"}'),
  ('thresholds', '{"warningThreshold": 75, "criticalThreshold": 50, "showThresholdFlags": true, "bmqSeparateThresholds": false, "bmqWarningThreshold": 80, "bmqCriticalThreshold": 60}'),
  ('member_handling', '{"newMemberGracePeriod": 4, "minimumTrainingNights": 3, "includeFTStaff": true, "showBMQBadge": true, "showTrendIndicators": true}'),
  ('formatting', '{"defaultSortOrder": "division_rank", "showServiceNumber": true, "dateFormat": "DD MMM YYYY", "pageSize": "letter"}');

-- Table comments
COMMENT ON TABLE report_settings IS 'Key-value store for configurable report generation settings';
COMMENT ON COLUMN report_settings.key IS 'Setting category: schedule, working_hours, thresholds, member_handling, formatting';
COMMENT ON COLUMN report_settings.value IS 'JSON object containing settings for the category';
