-- Migration: BMQ Courses and Enrollments
-- Tracks Basic Military Qualification courses and student enrollments for specialized attendance reporting

-- BMQ Courses table
CREATE TABLE bmq_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,          -- e.g., "Fall 2024 BMQ"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  training_day VARCHAR(10) NOT NULL,   -- e.g., "saturday"
  training_start_time TIME NOT NULL,
  training_end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bmq_courses_is_active ON bmq_courses(is_active);
CREATE INDEX idx_bmq_courses_dates ON bmq_courses(start_date, end_date);

-- BMQ Enrollments table
CREATE TABLE bmq_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  bmq_course_id UUID NOT NULL REFERENCES bmq_courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'withdrawn')),
  UNIQUE(member_id, bmq_course_id)
);

CREATE INDEX idx_bmq_enrollments_member ON bmq_enrollments(member_id);
CREATE INDEX idx_bmq_enrollments_course ON bmq_enrollments(bmq_course_id);
CREATE INDEX idx_bmq_enrollments_status ON bmq_enrollments(status);

-- Auto-update timestamp trigger
CREATE TRIGGER update_bmq_courses_updated_at BEFORE UPDATE ON bmq_courses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table comments
COMMENT ON TABLE bmq_courses IS 'Basic Military Qualification courses with training schedules';
COMMENT ON COLUMN bmq_courses.training_day IS 'Day of week for training sessions (lowercase, e.g., "saturday")';
COMMENT ON COLUMN bmq_courses.is_active IS 'Whether course is currently active for enrollment';

COMMENT ON TABLE bmq_enrollments IS 'Member enrollments in BMQ courses';
COMMENT ON COLUMN bmq_enrollments.status IS 'Enrollment status: enrolled (active), completed (finished), withdrawn (dropped out)';
COMMENT ON COLUMN bmq_enrollments.completed_at IS 'Timestamp when member completed the course';
