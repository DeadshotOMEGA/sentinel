-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(200) NOT NULL,
    "full_name" VARCHAR(200),
    "role" VARCHAR(20) NOT NULL,
    "last_login" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "disabled_at" TIMESTAMP(6),
    "disabled_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "details" JSONB,
    "ip_address" INET,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "serial_number" VARCHAR(100) NOT NULL,
    "assignment_type" VARCHAR(20) NOT NULL,
    "assigned_to_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "badge_status_id" UUID,
    "last_used" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID,
    "badge_id" UUID,
    "direction" VARCHAR(10) NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kiosk_id" VARCHAR(50) NOT NULL,
    "synced" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "flagged_for_review" BOOLEAN DEFAULT false,
    "flag_reason" VARCHAR(255),
    "method" VARCHAR(20) DEFAULT 'badge',
    "created_by_admin" UUID,

    CONSTRAINT "checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "divisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "rank" VARCHAR(50),
    "organization" VARCHAR(200) NOT NULL,
    "role" VARCHAR(100) NOT NULL,
    "badge_id" UUID,
    "badge_assigned_at" TIMESTAMP(6),
    "access_start" DATE,
    "access_end" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_checkins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_attendee_id" UUID NOT NULL,
    "badge_id" UUID NOT NULL,
    "direction" VARCHAR(10) NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kiosk_id" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "auto_expire_badges" BOOLEAN DEFAULT true,
    "custom_roles" JSONB,
    "created_by" UUID,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_number" VARCHAR(20) NOT NULL,
    "rank_id" UUID NOT NULL,
    "rank" VARCHAR(50) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(200),
    "email" VARCHAR(255),
    "mobile_phone" VARCHAR(50),
    "division_id" UUID,
    "badge_id" UUID,
    "member_type" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "member_type_id" UUID,
    "member_status_id" UUID,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "employee_number" VARCHAR(20),
    "initials" VARCHAR(10),
    "mess" VARCHAR(50),
    "moc" VARCHAR(100),
    "class_details" VARCHAR(100),
    "home_phone" VARCHAR(30),
    "notes" TEXT,
    "contract_start" DATE,
    "contract_end" DATE,
    "missed_checkout_count" INTEGER NOT NULL DEFAULT 0,
    "last_missed_checkout" TIMESTAMP(6),
    "pin_hash" VARCHAR(255),
    "account_level" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID NOT NULL,
    "token" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "ip_address" INET,
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "chip_variant" VARCHAR(20) NOT NULL DEFAULT 'solid',
    "chip_color" VARCHAR(20) NOT NULL DEFAULT 'default',
    "is_positional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "alert_type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "badge_serial" VARCHAR(100),
    "member_id" UUID,
    "kiosk_id" VARCHAR(50) NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "acknowledged_by" UUID,
    "acknowledged_at" TIMESTAMP(6),
    "acknowledge_note" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "rank_prefix" VARCHAR(50),
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "display_name" VARCHAR(200),
    "organization" VARCHAR(200),
    "visit_type" VARCHAR(50) NOT NULL,
    "visit_type_id" UUID,
    "visit_reason" TEXT,
    "event_id" UUID,
    "host_member_id" UUID,
    "check_in_time" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_out_time" TIMESTAMP(6),
    "temporary_badge_id" UUID,
    "kiosk_id" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "admin_notes" TEXT,
    "check_in_method" VARCHAR(20) DEFAULT 'kiosk',
    "created_by_admin" UUID,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bmq_courses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "training_start_time" TIME(6) NOT NULL,
    "training_end_time" TIME(6) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "training_days" TEXT[],

    CONSTRAINT "bmq_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bmq_enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID NOT NULL,
    "bmq_course_id" UUID NOT NULL,
    "enrolled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "status" VARCHAR(20) NOT NULL DEFAULT 'enrolled',

    CONSTRAINT "bmq_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migrations" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "applied_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "migrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_type" VARCHAR(50) NOT NULL,
    "report_config" JSONB NOT NULL,
    "generated_by" UUID,
    "is_scheduled" BOOLEAN DEFAULT false,
    "scheduled_report_id" UUID,
    "generated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "file_size_bytes" INTEGER,
    "generation_time_ms" INTEGER,

    CONSTRAINT "report_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_settings" (
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "training_years" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "holiday_exclusions" JSONB NOT NULL DEFAULT '[]',
    "day_exceptions" JSONB NOT NULL DEFAULT '[]',
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dds_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID NOT NULL,
    "assigned_date" DATE NOT NULL,
    "accepted_at" TIMESTAMP(6),
    "released_at" TIMESTAMP(6),
    "transferred_to" UUID,
    "assigned_by" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dds_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsibility_audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID NOT NULL,
    "tag_name" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "from_member_id" UUID,
    "to_member_id" UUID,
    "performed_by" UUID,
    "performed_by_type" VARCHAR(20) NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "responsibility_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "chip_variant" VARCHAR(20) NOT NULL DEFAULT 'solid',
    "chip_color" VARCHAR(20) NOT NULL DEFAULT 'default',
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "chip_variant" VARCHAR(20) NOT NULL DEFAULT 'solid',
    "chip_color" VARCHAR(20) NOT NULL DEFAULT 'default',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "chip_variant" VARCHAR(20) NOT NULL DEFAULT 'solid',
    "chip_color" VARCHAR(20) NOT NULL DEFAULT 'default',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "chip_variant" VARCHAR(20) NOT NULL DEFAULT 'solid',
    "chip_color" VARCHAR(20) NOT NULL DEFAULT 'default',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badge_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "list_type" VARCHAR(50) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "branch" VARCHAR(20) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "replaced_by" UUID,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "name" VARCHAR(200),
    "image" VARCHAR(500),
    "role" VARCHAR(50) NOT NULL DEFAULT 'quartermaster',
    "badge_id" VARCHAR(100),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "ip_address" INET,
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "account_id" VARCHAR(255) NOT NULL,
    "provider_id" VARCHAR(100) NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "expires_at" TIMESTAMP(6),
    "password" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identifier" VARCHAR(255) NOT NULL,
    "value" VARCHAR(500) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "category" VARCHAR(50) NOT NULL DEFAULT 'system',
    "description" VARCHAR(500),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_configs" (
    "key" VARCHAR(100) NOT NULL,
    "config" JSONB NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_configs_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "stat_holidays" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" DATE NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "province" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "stat_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualification_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "can_receive_lockup" BOOLEAN NOT NULL DEFAULT true,
    "is_automatic" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "tag_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "qualification_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_qualifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID NOT NULL,
    "qualification_type_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "granted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by" UUID,
    "expires_at" TIMESTAMP(6),
    "revoked_at" TIMESTAMP(6),
    "revoked_by" UUID,
    "revoke_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "member_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duty_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "role_type" VARCHAR(20) NOT NULL,
    "schedule_type" VARCHAR(20) NOT NULL,
    "active_days" INTEGER[],
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "duty_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duty_positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "duty_role_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "max_slots" INTEGER NOT NULL DEFAULT 1,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "duty_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "duty_role_id" UUID NOT NULL,
    "week_start_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "created_by" UUID,
    "published_at" TIMESTAMP(6),
    "published_by" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "weekly_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schedule_id" UUID NOT NULL,
    "duty_position_id" UUID,
    "member_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'assigned',
    "confirmed_at" TIMESTAMP(6),
    "released_at" TIMESTAMP(6),
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "schedule_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dw_night_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schedule_id" UUID NOT NULL,
    "night_date" DATE NOT NULL,
    "duty_position_id" UUID NOT NULL,
    "override_type" VARCHAR(20) NOT NULL,
    "member_id" UUID,
    "base_member_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "dw_night_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lockup_status" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" DATE NOT NULL,
    "current_holder_id" UUID,
    "acquired_at" TIMESTAMP(6),
    "building_status" VARCHAR(20) NOT NULL DEFAULT 'secured',
    "secured_at" TIMESTAMP(6),
    "secured_by" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "lockup_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lockup_transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lockup_status_id" UUID NOT NULL,
    "from_member_id" UUID NOT NULL,
    "to_member_id" UUID NOT NULL,
    "transferred_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" VARCHAR(50) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lockup_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lockup_executions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lockup_status_id" UUID NOT NULL,
    "executed_by" UUID NOT NULL,
    "executed_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "members_checked_out" JSONB NOT NULL DEFAULT '[]',
    "visitors_checked_out" JSONB NOT NULL DEFAULT '[]',
    "total_checked_out" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lockup_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missed_checkouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "original_checkin_at" TIMESTAMP(6) NOT NULL,
    "forced_checkout_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_by" VARCHAR(30) NOT NULL,
    "resolved_by_admin_id" UUID,
    "lockup_execution_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "missed_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_event_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "default_duration_minutes" INTEGER NOT NULL DEFAULT 120,
    "requires_duty_watch" BOOLEAN NOT NULL DEFAULT false,
    "default_metadata" JSONB,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "unit_event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(200) NOT NULL,
    "event_type_id" UUID,
    "event_date" DATE NOT NULL,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "location" VARCHAR(200),
    "description" TEXT,
    "organizer" VARCHAR(200),
    "requires_duty_watch" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "metadata" JSONB,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "unit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_event_duty_positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "max_slots" INTEGER NOT NULL DEFAULT 1,
    "is_standard" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "unit_event_duty_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_event_duty_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "event_duty_position_id" UUID,
    "member_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'assigned',
    "is_volunteer" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMP(6),
    "released_at" TIMESTAMP(6),
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "unit_event_duty_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "idx_admin_users_email" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "idx_admin_users_disabled" ON "admin_users"("disabled");

-- CreateIndex
CREATE INDEX "idx_audit_log_admin_created" ON "audit_log"("admin_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_log_created" ON "audit_log"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_log_entity" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "badges_serial_number_key" ON "badges"("serial_number");

-- CreateIndex
CREATE INDEX "idx_badges_assigned_to" ON "badges"("assigned_to_id");

-- CreateIndex
CREATE INDEX "idx_badges_serial_number" ON "badges"("serial_number");

-- CreateIndex
CREATE INDEX "idx_badges_status" ON "badges"("status");

-- CreateIndex
CREATE INDEX "idx_badges_assignment_type" ON "badges"("assignment_type");

-- CreateIndex
CREATE INDEX "idx_badges_badge_status_id" ON "badges"("badge_status_id");

-- CreateIndex
CREATE INDEX "idx_checkins_badge" ON "checkins"("badge_id");

-- CreateIndex
CREATE INDEX "idx_checkins_kiosk" ON "checkins"("kiosk_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_checkins_member_timestamp" ON "checkins"("member_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_checkins_timestamp" ON "checkins"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_checkins_method" ON "checkins"("method");

-- CreateIndex
CREATE UNIQUE INDEX "divisions_code_key" ON "divisions"("code");

-- CreateIndex
CREATE INDEX "idx_event_attendees_badge_id" ON "event_attendees"("badge_id");

-- CreateIndex
CREATE INDEX "idx_event_attendees_event_id" ON "event_attendees"("event_id");

-- CreateIndex
CREATE INDEX "idx_event_attendees_status" ON "event_attendees"("status");

-- CreateIndex
CREATE INDEX "idx_event_checkins_attendee" ON "event_checkins"("event_attendee_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_event_checkins_badge" ON "event_checkins"("badge_id");

-- CreateIndex
CREATE INDEX "idx_event_checkins_kiosk" ON "event_checkins"("kiosk_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_event_checkins_timestamp" ON "event_checkins"("timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "events_code_key" ON "events"("code");

-- CreateIndex
CREATE INDEX "idx_events_dates" ON "events"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "idx_events_status" ON "events"("status");

-- CreateIndex
CREATE UNIQUE INDEX "members_service_number_key" ON "members"("service_number");

-- CreateIndex
CREATE INDEX "idx_members_badge" ON "members"("badge_id");

-- CreateIndex
CREATE INDEX "idx_members_division" ON "members"("division_id");

-- CreateIndex
CREATE INDEX "idx_members_employee_number" ON "members"("employee_number");

-- CreateIndex
CREATE INDEX "idx_members_mess" ON "members"("mess");

-- CreateIndex
CREATE INDEX "idx_members_moc" ON "members"("moc");

-- CreateIndex
CREATE INDEX "idx_members_rank_id" ON "members"("rank_id");

-- CreateIndex
CREATE INDEX "idx_members_service_number" ON "members"("service_number");

-- CreateIndex
CREATE INDEX "idx_members_status" ON "members"("status");

-- CreateIndex
CREATE INDEX "idx_members_email" ON "members"("email");

-- CreateIndex
CREATE INDEX "idx_members_member_type_id" ON "members"("member_type_id");

-- CreateIndex
CREATE INDEX "idx_members_member_status_id" ON "members"("member_status_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_sessions_token_key" ON "member_sessions"("token");

-- CreateIndex
CREATE INDEX "idx_member_sessions_member" ON "member_sessions"("member_id");

-- CreateIndex
CREATE INDEX "idx_member_sessions_expires" ON "member_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "idx_tags_name" ON "tags"("name");

-- CreateIndex
CREATE INDEX "idx_tags_display_order" ON "tags"("display_order");

-- CreateIndex
CREATE INDEX "idx_member_tags_member" ON "member_tags"("member_id");

-- CreateIndex
CREATE INDEX "idx_member_tags_tag" ON "member_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_member_tags_member_tag" ON "member_tags"("member_id", "tag_id");

-- CreateIndex
CREATE INDEX "idx_security_alerts_status" ON "security_alerts"("status");

-- CreateIndex
CREATE INDEX "idx_security_alerts_type" ON "security_alerts"("alert_type");

-- CreateIndex
CREATE INDEX "idx_security_alerts_severity" ON "security_alerts"("severity");

-- CreateIndex
CREATE INDEX "idx_security_alerts_created" ON "security_alerts"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_visitors_check_in_time" ON "visitors"("check_in_time" DESC);

-- CreateIndex
CREATE INDEX "idx_visitors_check_out_time" ON "visitors"("check_out_time");

-- CreateIndex
CREATE INDEX "idx_visitors_event" ON "visitors"("event_id");

-- CreateIndex
CREATE INDEX "idx_visitors_host" ON "visitors"("host_member_id");

-- CreateIndex
CREATE INDEX "idx_visitors_check_in_method" ON "visitors"("check_in_method");

-- CreateIndex
CREATE INDEX "idx_visitors_temporary_badge" ON "visitors"("temporary_badge_id");

-- CreateIndex
CREATE INDEX "idx_visitors_visit_type_id" ON "visitors"("visit_type_id");

-- CreateIndex
CREATE INDEX "idx_bmq_courses_dates" ON "bmq_courses"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "idx_bmq_courses_is_active" ON "bmq_courses"("is_active");

-- CreateIndex
CREATE INDEX "idx_bmq_enrollments_course" ON "bmq_enrollments"("bmq_course_id");

-- CreateIndex
CREATE INDEX "idx_bmq_enrollments_member" ON "bmq_enrollments"("member_id");

-- CreateIndex
CREATE INDEX "idx_bmq_enrollments_status" ON "bmq_enrollments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bmq_enrollments_member_id_bmq_course_id_key" ON "bmq_enrollments"("member_id", "bmq_course_id");

-- CreateIndex
CREATE UNIQUE INDEX "migrations_name_key" ON "migrations"("name");

-- CreateIndex
CREATE INDEX "idx_report_audit_log_generated_at" ON "report_audit_log"("generated_at");

-- CreateIndex
CREATE INDEX "idx_report_audit_log_generated_by" ON "report_audit_log"("generated_by");

-- CreateIndex
CREATE INDEX "idx_report_audit_log_is_scheduled" ON "report_audit_log"("is_scheduled");

-- CreateIndex
CREATE INDEX "idx_report_audit_log_type" ON "report_audit_log"("report_type");

-- CreateIndex
CREATE INDEX "idx_training_years_is_current" ON "training_years"("is_current");

-- CreateIndex
CREATE INDEX "idx_training_years_start_date" ON "training_years"("start_date");

-- CreateIndex
CREATE INDEX "idx_dds_assignments_member" ON "dds_assignments"("member_id");

-- CreateIndex
CREATE INDEX "idx_dds_assignments_date" ON "dds_assignments"("assigned_date");

-- CreateIndex
CREATE INDEX "idx_dds_assignments_status" ON "dds_assignments"("status");

-- CreateIndex
CREATE INDEX "idx_responsibility_audit_member" ON "responsibility_audit_log"("member_id");

-- CreateIndex
CREATE INDEX "idx_responsibility_audit_tag" ON "responsibility_audit_log"("tag_name");

-- CreateIndex
CREATE INDEX "idx_responsibility_audit_timestamp" ON "responsibility_audit_log"("timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "member_statuses_code_key" ON "member_statuses"("code");

-- CreateIndex
CREATE INDEX "idx_member_statuses_code" ON "member_statuses"("code");

-- CreateIndex
CREATE INDEX "idx_member_statuses_name" ON "member_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "member_types_code_key" ON "member_types"("code");

-- CreateIndex
CREATE INDEX "idx_member_types_code" ON "member_types"("code");

-- CreateIndex
CREATE INDEX "idx_member_types_name" ON "member_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "visit_types_code_key" ON "visit_types"("code");

-- CreateIndex
CREATE INDEX "idx_visit_types_code" ON "visit_types"("code");

-- CreateIndex
CREATE INDEX "idx_visit_types_name" ON "visit_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "badge_statuses_code_key" ON "badge_statuses"("code");

-- CreateIndex
CREATE INDEX "idx_badge_statuses_code" ON "badge_statuses"("code");

-- CreateIndex
CREATE INDEX "idx_badge_statuses_name" ON "badge_statuses"("name");

-- CreateIndex
CREATE INDEX "idx_list_items_list_type" ON "list_items"("list_type");

-- CreateIndex
CREATE INDEX "idx_list_items_list_type_display_order" ON "list_items"("list_type", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "list_items_list_type_code_unique" ON "list_items"("list_type", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ranks_code_key" ON "ranks"("code");

-- CreateIndex
CREATE INDEX "idx_ranks_branch_order" ON "ranks"("branch", "display_order");

-- CreateIndex
CREATE INDEX "idx_ranks_code" ON "ranks"("code");

-- CreateIndex
CREATE INDEX "idx_ranks_active" ON "ranks"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_badge_id_key" ON "user"("badge_id");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "user"("email");

-- CreateIndex
CREATE INDEX "idx_users_badge_id" ON "user"("badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "idx_sessions_user_id" ON "session"("user_id");

-- CreateIndex
CREATE INDEX "idx_sessions_expires_at" ON "session"("expires_at");

-- CreateIndex
CREATE INDEX "idx_accounts_user_id" ON "account"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_provider_account_unique" ON "account"("provider_id", "account_id");

-- CreateIndex
CREATE INDEX "idx_verifications_expires_at" ON "verification"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "verification_identifier_value_unique" ON "verification"("identifier", "value");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "idx_settings_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "idx_settings_category" ON "settings"("category");

-- CreateIndex
CREATE INDEX "idx_alert_configs_key" ON "alert_configs"("key");

-- CreateIndex
CREATE UNIQUE INDEX "stat_holidays_date_key" ON "stat_holidays"("date");

-- CreateIndex
CREATE INDEX "idx_stat_holidays_date" ON "stat_holidays"("date");

-- CreateIndex
CREATE INDEX "idx_stat_holidays_active" ON "stat_holidays"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "qualification_types_code_key" ON "qualification_types"("code");

-- CreateIndex
CREATE INDEX "idx_qualification_types_code" ON "qualification_types"("code");

-- CreateIndex
CREATE INDEX "idx_qualification_types_lockup" ON "qualification_types"("can_receive_lockup");

-- CreateIndex
CREATE INDEX "idx_qualification_types_tag" ON "qualification_types"("tag_id");

-- CreateIndex
CREATE INDEX "idx_member_qualifications_member" ON "member_qualifications"("member_id");

-- CreateIndex
CREATE INDEX "idx_member_qualifications_type" ON "member_qualifications"("qualification_type_id");

-- CreateIndex
CREATE INDEX "idx_member_qualifications_status" ON "member_qualifications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "member_qualification_unique" ON "member_qualifications"("member_id", "qualification_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "duty_roles_code_key" ON "duty_roles"("code");

-- CreateIndex
CREATE INDEX "idx_duty_roles_code" ON "duty_roles"("code");

-- CreateIndex
CREATE INDEX "idx_duty_positions_role" ON "duty_positions"("duty_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "duty_position_role_code_unique" ON "duty_positions"("duty_role_id", "code");

-- CreateIndex
CREATE INDEX "idx_weekly_schedules_role" ON "weekly_schedules"("duty_role_id");

-- CreateIndex
CREATE INDEX "idx_weekly_schedules_week" ON "weekly_schedules"("week_start_date");

-- CreateIndex
CREATE INDEX "idx_weekly_schedules_status" ON "weekly_schedules"("status");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_schedule_role_week_unique" ON "weekly_schedules"("duty_role_id", "week_start_date");

-- CreateIndex
CREATE INDEX "idx_schedule_assignments_schedule" ON "schedule_assignments"("schedule_id");

-- CreateIndex
CREATE INDEX "idx_schedule_assignments_member" ON "schedule_assignments"("member_id");

-- CreateIndex
CREATE INDEX "idx_schedule_assignments_position" ON "schedule_assignments"("duty_position_id");

-- CreateIndex
CREATE INDEX "idx_dw_overrides_schedule" ON "dw_night_overrides"("schedule_id");

-- CreateIndex
CREATE INDEX "idx_dw_overrides_night_date" ON "dw_night_overrides"("night_date");

-- CreateIndex
CREATE INDEX "idx_dw_overrides_member" ON "dw_night_overrides"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "dw_override_unique" ON "dw_night_overrides"("schedule_id", "night_date", "duty_position_id", "base_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "lockup_status_date_key" ON "lockup_status"("date");

-- CreateIndex
CREATE INDEX "idx_lockup_status_date" ON "lockup_status"("date");

-- CreateIndex
CREATE INDEX "idx_lockup_status_active" ON "lockup_status"("is_active");

-- CreateIndex
CREATE INDEX "idx_lockup_status_holder" ON "lockup_status"("current_holder_id");

-- CreateIndex
CREATE INDEX "idx_lockup_transfers_status" ON "lockup_transfers"("lockup_status_id");

-- CreateIndex
CREATE INDEX "idx_lockup_transfers_from" ON "lockup_transfers"("from_member_id");

-- CreateIndex
CREATE INDEX "idx_lockup_transfers_to" ON "lockup_transfers"("to_member_id");

-- CreateIndex
CREATE INDEX "idx_lockup_transfers_time" ON "lockup_transfers"("transferred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "lockup_executions_lockup_status_id_key" ON "lockup_executions"("lockup_status_id");

-- CreateIndex
CREATE INDEX "idx_lockup_executions_time" ON "lockup_executions"("executed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_lockup_executions_by" ON "lockup_executions"("executed_by");

-- CreateIndex
CREATE INDEX "idx_missed_checkouts_member" ON "missed_checkouts"("member_id");

-- CreateIndex
CREATE INDEX "idx_missed_checkouts_date" ON "missed_checkouts"("date");

-- CreateIndex
CREATE INDEX "idx_missed_checkouts_resolved_by" ON "missed_checkouts"("resolved_by");

-- CreateIndex
CREATE INDEX "idx_unit_event_types_category" ON "unit_event_types"("category");

-- CreateIndex
CREATE INDEX "idx_unit_events_date" ON "unit_events"("event_date");

-- CreateIndex
CREATE INDEX "idx_unit_events_status" ON "unit_events"("status");

-- CreateIndex
CREATE INDEX "idx_unit_events_type" ON "unit_events"("event_type_id");

-- CreateIndex
CREATE INDEX "idx_unit_event_duty_positions_event" ON "unit_event_duty_positions"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "unit_event_duty_position_event_code_unique" ON "unit_event_duty_positions"("event_id", "code");

-- CreateIndex
CREATE INDEX "idx_unit_event_duty_assignments_event" ON "unit_event_duty_assignments"("event_id");

-- CreateIndex
CREATE INDEX "idx_unit_event_duty_assignments_member" ON "unit_event_duty_assignments"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "unit_event_duty_assignment_unique" ON "unit_event_duty_assignments"("event_id", "member_id", "event_duty_position_id");

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_disabled_by_fkey" FOREIGN KEY ("disabled_by") REFERENCES "admin_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admin_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_badge_status_id_fkey" FOREIGN KEY ("badge_status_id") REFERENCES "badge_statuses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_created_by_admin_fkey" FOREIGN KEY ("created_by_admin") REFERENCES "admin_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "event_checkins" ADD CONSTRAINT "event_checkins_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "event_checkins" ADD CONSTRAINT "event_checkins_event_attendee_id_fkey" FOREIGN KEY ("event_attendee_id") REFERENCES "event_attendees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_rank_id_fkey" FOREIGN KEY ("rank_id") REFERENCES "ranks"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_member_type_id_fkey" FOREIGN KEY ("member_type_id") REFERENCES "member_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_member_status_id_fkey" FOREIGN KEY ("member_status_id") REFERENCES "member_statuses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_sessions" ADD CONSTRAINT "member_sessions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_tags" ADD CONSTRAINT "member_tags_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_tags" ADD CONSTRAINT "member_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "security_alerts" ADD CONSTRAINT "security_alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_created_by_admin_fkey" FOREIGN KEY ("created_by_admin") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_host_member_id_fkey" FOREIGN KEY ("host_member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_temporary_badge_id_fkey" FOREIGN KEY ("temporary_badge_id") REFERENCES "badges"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_visit_type_id_fkey" FOREIGN KEY ("visit_type_id") REFERENCES "visit_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bmq_enrollments" ADD CONSTRAINT "bmq_enrollments_bmq_course_id_fkey" FOREIGN KEY ("bmq_course_id") REFERENCES "bmq_courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bmq_enrollments" ADD CONSTRAINT "bmq_enrollments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "report_audit_log" ADD CONSTRAINT "report_audit_log_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "admin_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dds_assignments" ADD CONSTRAINT "dds_assignments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dds_assignments" ADD CONSTRAINT "dds_assignments_transferred_to_fkey" FOREIGN KEY ("transferred_to") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dds_assignments" ADD CONSTRAINT "dds_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ranks" ADD CONSTRAINT "ranks_replaced_by_fkey" FOREIGN KEY ("replaced_by") REFERENCES "ranks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_types" ADD CONSTRAINT "qualification_types_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_qualifications" ADD CONSTRAINT "member_qualifications_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_qualifications" ADD CONSTRAINT "member_qualifications_qualification_type_id_fkey" FOREIGN KEY ("qualification_type_id") REFERENCES "qualification_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_qualifications" ADD CONSTRAINT "member_qualifications_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_qualifications" ADD CONSTRAINT "member_qualifications_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "duty_positions" ADD CONSTRAINT "duty_positions_duty_role_id_fkey" FOREIGN KEY ("duty_role_id") REFERENCES "duty_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "weekly_schedules" ADD CONSTRAINT "weekly_schedules_duty_role_id_fkey" FOREIGN KEY ("duty_role_id") REFERENCES "duty_roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "weekly_schedules" ADD CONSTRAINT "weekly_schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "weekly_schedules" ADD CONSTRAINT "weekly_schedules_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "weekly_schedules"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_duty_position_id_fkey" FOREIGN KEY ("duty_position_id") REFERENCES "duty_positions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dw_night_overrides" ADD CONSTRAINT "dw_night_overrides_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "weekly_schedules"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dw_night_overrides" ADD CONSTRAINT "dw_night_overrides_duty_position_id_fkey" FOREIGN KEY ("duty_position_id") REFERENCES "duty_positions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dw_night_overrides" ADD CONSTRAINT "dw_night_overrides_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dw_night_overrides" ADD CONSTRAINT "dw_night_overrides_base_member_id_fkey" FOREIGN KEY ("base_member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lockup_status" ADD CONSTRAINT "lockup_status_current_holder_id_fkey" FOREIGN KEY ("current_holder_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lockup_status" ADD CONSTRAINT "lockup_status_secured_by_fkey" FOREIGN KEY ("secured_by") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lockup_transfers" ADD CONSTRAINT "lockup_transfers_lockup_status_id_fkey" FOREIGN KEY ("lockup_status_id") REFERENCES "lockup_status"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lockup_transfers" ADD CONSTRAINT "lockup_transfers_from_member_id_fkey" FOREIGN KEY ("from_member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lockup_transfers" ADD CONSTRAINT "lockup_transfers_to_member_id_fkey" FOREIGN KEY ("to_member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lockup_executions" ADD CONSTRAINT "lockup_executions_lockup_status_id_fkey" FOREIGN KEY ("lockup_status_id") REFERENCES "lockup_status"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lockup_executions" ADD CONSTRAINT "lockup_executions_executed_by_fkey" FOREIGN KEY ("executed_by") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "missed_checkouts" ADD CONSTRAINT "missed_checkouts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "missed_checkouts" ADD CONSTRAINT "missed_checkouts_resolved_by_admin_id_fkey" FOREIGN KEY ("resolved_by_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "unit_events" ADD CONSTRAINT "unit_events_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "unit_event_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "unit_event_duty_positions" ADD CONSTRAINT "unit_event_duty_positions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "unit_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "unit_event_duty_assignments" ADD CONSTRAINT "unit_event_duty_assignments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "unit_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "unit_event_duty_assignments" ADD CONSTRAINT "unit_event_duty_assignments_event_duty_position_id_fkey" FOREIGN KEY ("event_duty_position_id") REFERENCES "unit_event_duty_positions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "unit_event_duty_assignments" ADD CONSTRAINT "unit_event_duty_assignments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

