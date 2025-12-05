-- Add contract-related fields to members table
-- Notes: freeform text for contract details, ED&T exemptions, etc.
-- Contract dates: start and end dates for Class B/C contracts

ALTER TABLE members
  ADD COLUMN notes TEXT,
  ADD COLUMN contract_start DATE,
  ADD COLUMN contract_end DATE;

-- Add index for finding members with expiring contracts
CREATE INDEX idx_members_contract_end ON members(contract_end) WHERE contract_end IS NOT NULL;

COMMENT ON COLUMN members.notes IS 'Freeform notes: contract details, ED&T exemptions, work location';
COMMENT ON COLUMN members.contract_start IS 'Contract start date for Class B/C members';
COMMENT ON COLUMN members.contract_end IS 'Contract end date for Class B/C members';
