-- Add better-auth tables for authentication
-- Migration created: 2026-01-19

-- User table for authentication
CREATE TABLE IF NOT EXISTS "user" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "email_verified" BOOLEAN NOT NULL DEFAULT FALSE,
  "name" VARCHAR(200),
  "image" VARCHAR(500),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_users_email" ON "user"("email");

-- Session table for session management
CREATE TABLE IF NOT EXISTS "session" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "token" VARCHAR(500) UNIQUE NOT NULL,
  "expires_at" TIMESTAMP(6) NOT NULL,
  "ip_address" INET,
  "user_agent" VARCHAR(500),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "session"("user_id");
CREATE INDEX IF NOT EXISTS "idx_sessions_expires_at" ON "session"("expires_at");

-- Account table for OAuth providers and email/password
CREATE TABLE IF NOT EXISTS "account" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "account_id" VARCHAR(255) NOT NULL,
  "provider_id" VARCHAR(100) NOT NULL,
  "access_token" TEXT,
  "refresh_token" TEXT,
  "id_token" TEXT,
  "expires_at" TIMESTAMP(6),
  "password" VARCHAR(255),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "account_provider_account_unique" UNIQUE ("provider_id", "account_id")
);

CREATE INDEX IF NOT EXISTS "idx_accounts_user_id" ON "account"("user_id");

-- Verification table for email verification tokens
CREATE TABLE IF NOT EXISTS "verification" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" VARCHAR(255) NOT NULL,
  "value" VARCHAR(500) NOT NULL,
  "expires_at" TIMESTAMP(6) NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "verification_identifier_value_unique" UNIQUE ("identifier", "value")
);

CREATE INDEX IF NOT EXISTS "idx_verifications_expires_at" ON "verification"("expires_at");

-- API Key table for kiosk and external integration authentication
CREATE TABLE IF NOT EXISTS "api_key" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "key" VARCHAR(255) UNIQUE NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "scopes" TEXT[] DEFAULT '{}',
  "expires_at" TIMESTAMP(6) NOT NULL,
  "last_used" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_api_keys_user_id" ON "api_key"("user_id");
CREATE INDEX IF NOT EXISTS "idx_api_keys_expires_at" ON "api_key"("expires_at");

-- Add comment to track migration
COMMENT ON TABLE "user" IS 'Better-auth user accounts';
COMMENT ON TABLE "session" IS 'Better-auth user sessions';
COMMENT ON TABLE "account" IS 'Better-auth OAuth accounts and email/password credentials';
COMMENT ON TABLE "verification" IS 'Better-auth email verification tokens';
COMMENT ON TABLE "api_key" IS 'Better-auth API keys for kiosks and integrations';
