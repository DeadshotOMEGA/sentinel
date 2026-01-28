-- ============================================================================
-- SEED RANKS - Canadian Armed Forces Rank Structure
-- ============================================================================
-- This script inserts all 57 active CAF ranks + 3 deprecated Navy ranks
-- Total: 60 ranks across Navy (19), Army (19), Air Force (19), Deprecated (3)
--
-- Order: Lower number = junior rank, Higher number = senior rank
-- Categories: junior_ncm, senior_ncm, junior_officer, senior_officer, general_officer
-- ============================================================================

-- ============================================================================
-- ROYAL CANADIAN NAVY (19 active ranks)
-- ============================================================================

-- Junior Non-Commissioned Members (4 ranks: S3, S2, S1, MS)
INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('S3', 'Sailor Third Class', 'navy', 'junior_ncm', 1, true, NULL),
  ('S2', 'Sailor Second Class', 'navy', 'junior_ncm', 2, true, NULL),
  ('S1', 'Sailor First Class', 'navy', 'junior_ncm', 3, true, NULL),
  ('MS', 'Master Sailor', 'navy', 'junior_ncm', 4, true, NULL);

-- Senior Non-Commissioned Members / Petty Officers (4 ranks: PO2, PO1, CPO2, CPO1)
INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('PO2', 'Petty Officer, 2nd Class', 'navy', 'senior_ncm', 5, true, NULL),
  ('PO1', 'Petty Officer, 1st Class', 'navy', 'senior_ncm', 6, true, NULL),
  ('CPO2', 'Chief Petty Officer, 2nd Class', 'navy', 'senior_ncm', 7, true, NULL),
  ('CPO1', 'Chief Petty Officer, 1st Class', 'navy', 'senior_ncm', 8, true, NULL);

-- Subordinate Officer (1 rank)
INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('NCdt', 'Naval Cadet', 'navy', 'junior_officer', 9, true, NULL);

-- Junior Officers (3 ranks: A/SLt, SLt, Lt(N))
INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('A/SLt', 'Acting Sub-Lieutenant', 'navy', 'junior_officer', 10, true, NULL),
  ('SLt', 'Sub-Lieutenant', 'navy', 'junior_officer', 11, true, NULL),
  ('Lt(N)', 'Lieutenant(N)', 'navy', 'junior_officer', 12, true, NULL);

-- Senior Officers (4 ranks: LCdr, Cdr, Capt(N))
INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('LCdr', 'Lieutenant-Commander', 'navy', 'senior_officer', 13, true, NULL),
  ('Cdr', 'Commander', 'navy', 'senior_officer', 14, true, NULL),
  ('Capt(N)', 'Captain(N)', 'navy', 'senior_officer', 15, true, NULL);

-- Flag Officers / General Officers (4 ranks: Cmdre, RAdm, VAdm, Adm)
INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('Cmdre', 'Commodore', 'navy', 'general_officer', 16, true, NULL),
  ('RAdm', 'Rear-Admiral', 'navy', 'general_officer', 17, true, NULL),
  ('VAdm', 'Vice-Admiral', 'navy', 'general_officer', 18, true, NULL),
  ('Adm', 'Admiral', 'navy', 'general_officer', 19, true, NULL);

-- ============================================================================
-- CANADIAN ARMY (19 active ranks)
-- ============================================================================

-- Junior Non-Commissioned Members (4 ranks: Pte (B), Pte (T), Cpl, MCpl)
INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('Pte (B)', 'Private (Basic)', 'army', 'junior_ncm', 1, true, NULL),
  ('Pte (T)', 'Private (Trained)', 'army', 'junior_ncm', 2, true, NULL),
  ('Cpl', 'Corporal', 'army', 'junior_ncm', 3, true, NULL),
  ('MCpl', 'Master Corporal', 'army', 'junior_ncm', 4, true, NULL);

-- Senior Non-Commissioned Members / Warrant Officers (4 ranks: Sgt, WO, MWO, CWO)
INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('Sgt', 'Sergeant', 'army', 'senior_ncm', 5, true, NULL),
  ('WO', 'Warrant Officer', 'army', 'senior_ncm', 6, true, NULL),
  ('MWO', 'Master Warrant Officer', 'army', 'senior_ncm', 7, true, NULL),
  ('CWO', 'Chief Warrant Officer', 'army', 'senior_ncm', 8, true, NULL);

-- Subordinate Officer (1 rank)
INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('OCdt', 'Officer Cadet', 'army', 'junior_officer', 9, true, NULL);

-- Junior Officers (3 ranks: 2Lt, Lt, Capt)
INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('2Lt', '2nd Lieutenant', 'army', 'junior_officer', 10, true, NULL),
  ('Lt', 'Lieutenant', 'army', 'junior_officer', 11, true, NULL),
  ('Capt', 'Captain', 'army', 'junior_officer', 12, true, NULL);

-- Senior Officers (4 ranks: Maj, LCol, Col)
INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('Maj', 'Major', 'army', 'senior_officer', 13, true, NULL),
  ('LCol', 'Lieutenant-Colonel', 'army', 'senior_officer', 14, true, NULL),
  ('Col', 'Colonel', 'army', 'senior_officer', 15, true, NULL);

-- General Officers (4 ranks: BGen, MGen, LGen, Gen)
INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('BGen', 'Brigadier-General', 'army', 'general_officer', 16, true, NULL),
  ('MGen', 'Major-General', 'army', 'general_officer', 17, true, NULL),
  ('LGen', 'Lieutenant-General', 'army', 'general_officer', 18, true, NULL),
  ('Gen', 'General', 'army', 'general_officer', 19, true, NULL);

-- ============================================================================
-- ROYAL CANADIAN AIR FORCE (19 active ranks)
-- ============================================================================

-- Junior Non-Commissioned Members (4 ranks: Avr (B), Avr (T), Cpl, MCpl)
INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('Avr (B)', 'Aviator (Basic)', 'air_force', 'junior_ncm', 1, true, NULL),
  ('Avr (T)', 'Aviator (Trained)', 'air_force', 'junior_ncm', 2, true, NULL),
  ('Cpl-AF', 'Corporal', 'air_force', 'junior_ncm', 3, true, NULL),
  ('MCpl-AF', 'Master Corporal', 'air_force', 'junior_ncm', 4, true, NULL);

-- Senior Non-Commissioned Members / Warrant Officers (4 ranks: Sgt, WO, MWO, CWO)
INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('Sgt-AF', 'Sergeant', 'air_force', 'senior_ncm', 5, true, NULL),
  ('WO-AF', 'Warrant Officer', 'air_force', 'senior_ncm', 6, true, NULL),
  ('MWO-AF', 'Master Warrant Officer', 'air_force', 'senior_ncm', 7, true, NULL),
  ('CWO-AF', 'Chief Warrant Officer', 'air_force', 'senior_ncm', 8, true, NULL);

-- Subordinate Officer (1 rank)
INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('OCdt-AF', 'Officer Cadet', 'air_force', 'junior_officer', 9, true, NULL);

-- Junior Officers (3 ranks: 2Lt, Lt, Capt)
INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('2Lt-AF', '2nd Lieutenant', 'air_force', 'junior_officer', 10, true, NULL),
  ('Lt-AF', 'Lieutenant', 'air_force', 'junior_officer', 11, true, NULL),
  ('Capt-AF', 'Captain', 'air_force', 'junior_officer', 12, true, NULL);

-- Senior Officers (3 ranks: Maj, LCol, Col)
INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('Maj-AF', 'Major', 'air_force', 'senior_officer', 13, true, NULL),
  ('LCol-AF', 'Lieutenant-Colonel', 'air_force', 'senior_officer', 14, true, NULL),
  ('Col-AF', 'Colonel', 'air_force', 'senior_officer', 15, true, NULL);

-- General Officers (4 ranks: BGen, MGen, LGen, Gen)
INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('BGen-AF', 'Brigadier-General', 'air_force', 'general_officer', 16, true, NULL),
  ('MGen-AF', 'Major-General', 'air_force', 'general_officer', 17, true, NULL),
  ('LGen-AF', 'Lieutenant-General', 'air_force', 'general_officer', 18, true, NULL),
  ('Gen-AF', 'General', 'air_force', 'general_officer', 19, true, NULL);

-- ============================================================================
-- DEPRECATED NAVY RANKS (3 inactive ranks for migration)
-- ============================================================================
-- These ranks are no longer used but are kept for data migration purposes.
-- The replaced_by column will be updated after the active ranks are inserted.
--
-- Migration mapping:
--   OS (Ordinary Seaman) → S3 (Sailor Third Class)
--   AB (Able Seaman) → S2 (Sailor Second Class)
--   LS (Leading Seaman) → S1 (Sailor First Class)
-- ============================================================================

INSERT INTO ranks (code, name, branch, category, display_order, is_active, replaced_by)
VALUES
  ('OS', 'Ordinary Seaman', 'navy', 'junior_ncm', 1, false, (SELECT id FROM ranks WHERE code = 'S3')),
  ('AB', 'Able Seaman', 'navy', 'junior_ncm', 2, false, (SELECT id FROM ranks WHERE code = 'S2')),
  ('LS', 'Leading Seaman', 'navy', 'junior_ncm', 3, false, (SELECT id FROM ranks WHERE code = 'S1'));

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the seed was successful:
--
-- SELECT COUNT(*) FROM ranks WHERE is_active = true;  -- Should return 57
-- SELECT COUNT(*) FROM ranks WHERE is_active = false; -- Should return 3
-- SELECT COUNT(*) FROM ranks;                        -- Should return 60
-- SELECT branch, COUNT(*) FROM ranks WHERE is_active = true GROUP BY branch;
--   -- navy: 19, army: 19, air_force: 19
--
-- SELECT code, name, branch, display_order FROM ranks WHERE branch = 'navy' AND is_active = true ORDER BY display_order;
-- SELECT code, name, replaced_by FROM ranks WHERE is_active = false;
-- ============================================================================
