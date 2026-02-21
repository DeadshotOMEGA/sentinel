-- ============================================================================
-- Migration: Add Ranks Table and Update Members
-- ============================================================================
-- Creates the ranks table for Canadian Armed Forces rank structure
-- Adds rank_id FK column to members table (nullable for migration period)
-- ============================================================================

-- CreateTable: ranks
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

-- CreateIndex: unique rank code
CREATE UNIQUE INDEX "ranks_code_key" ON "ranks"("code");

-- CreateIndex: ranks branch and order lookup (for sorting by seniority)
CREATE INDEX "idx_ranks_branch_order" ON "ranks"("branch", "display_order");

-- CreateIndex: ranks code lookup
CREATE INDEX "idx_ranks_code" ON "ranks"("code");

-- CreateIndex: ranks active status
CREATE INDEX "idx_ranks_active" ON "ranks"("is_active");

-- AddForeignKey: ranks self-reference for replacedBy
ALTER TABLE "ranks" ADD CONSTRAINT "ranks_replaced_by_fkey" FOREIGN KEY ("replaced_by") REFERENCES "ranks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AlterTable: add rank_id column to members (nullable during migration)
ALTER TABLE "members" ADD COLUMN "rank_id" UUID;

-- CreateIndex: members rank_id lookup
CREATE INDEX "idx_members_rank_id" ON "members"("rank_id");

-- AddForeignKey: members -> ranks
ALTER TABLE "members" ADD CONSTRAINT "members_rank_id_fkey" FOREIGN KEY ("rank_id") REFERENCES "ranks"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
