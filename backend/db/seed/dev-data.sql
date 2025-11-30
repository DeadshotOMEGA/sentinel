-- Development Seed Data for Sentinel RFID Attendance System
-- WARNING: This file contains test data and should NEVER be run in production

BEGIN;

-- ============================================================================
-- DIVISIONS
-- ============================================================================

INSERT INTO divisions (id, name, code, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'Operations', 'OPS', NOW() - INTERVAL '180 days'),
('22222222-2222-2222-2222-222222222222', 'Administration', 'ADMIN', NOW() - INTERVAL '180 days'),
('33333333-3333-3333-3333-333333333333', 'Training', 'TRAIN', NOW() - INTERVAL '180 days'),
('44444444-4444-4444-4444-444444444444', 'Command', 'CMD', NOW() - INTERVAL '180 days');

-- ============================================================================
-- MEMBERS
-- ============================================================================

-- Operations Division (Full-Time)
INSERT INTO members (id, service_number, rank, first_name, last_name, division_id, member_type, status, created_at) VALUES
('a0000001-0000-0000-0000-000000000001', 'V123456', 'CPO1', 'Sarah', 'MacDonald', '11111111-1111-1111-1111-111111111111', 'full_time', 'active', NOW() - INTERVAL '150 days'),
('a0000002-0000-0000-0000-000000000002', 'V234567', 'PO1', 'James', 'Wilson', '11111111-1111-1111-1111-111111111111', 'full_time', 'active', NOW() - INTERVAL '145 days'),
('a0000003-0000-0000-0000-000000000003', 'V345678', 'PO2', 'Emily', 'Chen', '11111111-1111-1111-1111-111111111111', 'full_time', 'active', NOW() - INTERVAL '140 days'),
('a0000004-0000-0000-0000-000000000004', 'V456789', 'MS', 'Michael', 'Brown', '11111111-1111-1111-1111-111111111111', 'full_time', 'active', NOW() - INTERVAL '135 days'),
('a0000005-0000-0000-0000-000000000005', 'V567890', 'LS', 'Amanda', 'Taylor', '11111111-1111-1111-1111-111111111111', 'full_time', 'active', NOW() - INTERVAL '130 days'),
('a0000006-0000-0000-0000-000000000006', 'V678901', 'AB', 'David', 'Johnson', '11111111-1111-1111-1111-111111111111', 'full_time', 'active', NOW() - INTERVAL '125 days'),

-- Operations Division (Reserve)
('a0000007-0000-0000-0000-000000000007', 'V789012', 'PO2', 'Jennifer', 'Lee', '11111111-1111-1111-1111-111111111111', 'reserve', 'active', NOW() - INTERVAL '120 days'),
('a0000008-0000-0000-0000-000000000008', 'V890123', 'MS', 'Robert', 'Martinez', '11111111-1111-1111-1111-111111111111', 'reserve', 'active', NOW() - INTERVAL '115 days'),
('a0000009-0000-0000-0000-000000000009', 'V901234', 'LS', 'Lisa', 'Anderson', '11111111-1111-1111-1111-111111111111', 'reserve', 'active', NOW() - INTERVAL '110 days'),

-- Administration Division (Full-Time)
('a0000010-0000-0000-0000-000000000010', 'V012345', 'CPO2', 'Thomas', 'White', '22222222-2222-2222-2222-222222222222', 'full_time', 'active', NOW() - INTERVAL '160 days'),
('a0000011-0000-0000-0000-000000000011', 'V123457', 'PO1', 'Michelle', 'Garcia', '22222222-2222-2222-2222-222222222222', 'full_time', 'active', NOW() - INTERVAL '155 days'),
('a0000012-0000-0000-0000-000000000012', 'V234568', 'PO2', 'Christopher', 'Davis', '22222222-2222-2222-2222-222222222222', 'full_time', 'active', NOW() - INTERVAL '150 days'),
('a0000013-0000-0000-0000-000000000013', 'V345679', 'MS', 'Jessica', 'Miller', '22222222-2222-2222-2222-222222222222', 'full_time', 'active', NOW() - INTERVAL '145 days'),

-- Administration Division (Reserve)
('a0000014-0000-0000-0000-000000000014', 'V456780', 'LS', 'Daniel', 'Wilson', '22222222-2222-2222-2222-222222222222', 'reserve', 'active', NOW() - INTERVAL '140 days'),
('a0000015-0000-0000-0000-000000000015', 'V567891', 'AB', 'Ashley', 'Moore', '22222222-2222-2222-2222-222222222222', 'reserve', 'active', NOW() - INTERVAL '135 days'),

-- Training Division (Full-Time)
('a0000016-0000-0000-0000-000000000016', 'V678902', 'LCdr', 'Kevin', 'Thompson', '33333333-3333-3333-3333-333333333333', 'full_time', 'active', NOW() - INTERVAL '170 days'),
('a0000017-0000-0000-0000-000000000017', 'V789013', 'Lt(N)', 'Rachel', 'Harris', '33333333-3333-3333-3333-333333333333', 'full_time', 'active', NOW() - INTERVAL '165 days'),
('a0000018-0000-0000-0000-000000000018', 'V890124', 'CPO2', 'Brian', 'Martin', '33333333-3333-3333-3333-333333333333', 'full_time', 'active', NOW() - INTERVAL '160 days'),
('a0000019-0000-0000-0000-000000000019', 'V901235', 'PO1', 'Nicole', 'Jackson', '33333333-3333-3333-3333-333333333333', 'full_time', 'active', NOW() - INTERVAL '155 days'),

-- Training Division (Reserve)
('a0000020-0000-0000-0000-000000000020', 'V012346', 'PO2', 'Steven', 'Lewis', '33333333-3333-3333-3333-333333333333', 'reserve', 'active', NOW() - INTERVAL '150 days'),
('a0000021-0000-0000-0000-000000000021', 'V123458', 'MS', 'Kimberly', 'Walker', '33333333-3333-3333-3333-333333333333', 'reserve', 'active', NOW() - INTERVAL '145 days'),

-- Command Division (Full-Time)
('a0000022-0000-0000-0000-000000000022', 'V234569', 'Cdr', 'William', 'Hall', '44444444-4444-4444-4444-444444444444', 'full_time', 'active', NOW() - INTERVAL '200 days'),
('a0000023-0000-0000-0000-000000000023', 'V345670', 'LCdr', 'Elizabeth', 'Allen', '44444444-4444-4444-4444-444444444444', 'full_time', 'active', NOW() - INTERVAL '195 days'),
('a0000024-0000-0000-0000-000000000024', 'V456781', 'Lt(N)', 'Matthew', 'Young', '44444444-4444-4444-4444-444444444444', 'full_time', 'active', NOW() - INTERVAL '190 days'),
('a0000025-0000-0000-0000-000000000025', 'V567892', 'CPO1', 'Samantha', 'King', '44444444-4444-4444-4444-444444444444', 'full_time', 'active', NOW() - INTERVAL '185 days'),

-- Inactive member (for testing)
('a0000026-0000-0000-0000-000000000026', 'V678903', 'AB', 'John', 'Inactive', '11111111-1111-1111-1111-111111111111', 'full_time', 'inactive', NOW() - INTERVAL '100 days');

-- ============================================================================
-- BADGES
-- ============================================================================

-- Badges assigned to members (26 badges for 25 active members)
INSERT INTO badges (id, serial_number, assignment_type, assigned_to_id, status, last_used, created_at) VALUES
('b0000001-0000-0000-0000-000000000001', 'NFC-001-A7B8C9', 'member', 'a0000001-0000-0000-0000-000000000001', 'active', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '150 days'),
('b0000002-0000-0000-0000-000000000002', 'NFC-002-D1E2F3', 'member', 'a0000002-0000-0000-0000-000000000002', 'active', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '145 days'),
('b0000003-0000-0000-0000-000000000003', 'NFC-003-G4H5I6', 'member', 'a0000003-0000-0000-0000-000000000003', 'active', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '140 days'),
('b0000004-0000-0000-0000-000000000004', 'NFC-004-J7K8L9', 'member', 'a0000004-0000-0000-0000-000000000004', 'active', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '135 days'),
('b0000005-0000-0000-0000-000000000005', 'NFC-005-M1N2O3', 'member', 'a0000005-0000-0000-0000-000000000005', 'active', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '130 days'),
('b0000006-0000-0000-0000-000000000006', 'NFC-006-P4Q5R6', 'member', 'a0000006-0000-0000-0000-000000000006', 'active', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '125 days'),
('b0000007-0000-0000-0000-000000000007', 'NFC-007-S7T8U9', 'member', 'a0000007-0000-0000-0000-000000000007', 'active', NOW() - INTERVAL '7 days', NOW() - INTERVAL '120 days'),
('b0000008-0000-0000-0000-000000000008', 'NFC-008-V1W2X3', 'member', 'a0000008-0000-0000-0000-000000000008', 'active', NOW() - INTERVAL '8 days', NOW() - INTERVAL '115 days'),
('b0000009-0000-0000-0000-000000000009', 'NFC-009-Y4Z5A6', 'member', 'a0000009-0000-0000-0000-000000000009', 'active', NOW() - INTERVAL '9 days', NOW() - INTERVAL '110 days'),
('b0000010-0000-0000-0000-000000000010', 'NFC-010-B7C8D9', 'member', 'a0000010-0000-0000-0000-000000000010', 'active', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '160 days'),
('b0000011-0000-0000-0000-000000000011', 'NFC-011-E1F2G3', 'member', 'a0000011-0000-0000-0000-000000000011', 'active', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '155 days'),
('b0000012-0000-0000-0000-000000000012', 'NFC-012-H4I5J6', 'member', 'a0000012-0000-0000-0000-000000000012', 'active', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '150 days'),
('b0000013-0000-0000-0000-000000000013', 'NFC-013-K7L8M9', 'member', 'a0000013-0000-0000-0000-000000000013', 'active', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '145 days'),
('b0000014-0000-0000-0000-000000000014', 'NFC-014-N1O2P3', 'member', 'a0000014-0000-0000-0000-000000000014', 'active', NOW() - INTERVAL '14 days', NOW() - INTERVAL '140 days'),
('b0000015-0000-0000-0000-000000000015', 'NFC-015-Q4R5S6', 'member', 'a0000015-0000-0000-0000-000000000015', 'active', NOW() - INTERVAL '15 days', NOW() - INTERVAL '135 days'),
('b0000016-0000-0000-0000-000000000016', 'NFC-016-T7U8V9', 'member', 'a0000016-0000-0000-0000-000000000016', 'active', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '170 days'),
('b0000017-0000-0000-0000-000000000017', 'NFC-017-W1X2Y3', 'member', 'a0000017-0000-0000-0000-000000000017', 'active', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '165 days'),
('b0000018-0000-0000-0000-000000000018', 'NFC-018-Z4A5B6', 'member', 'a0000018-0000-0000-0000-000000000018', 'active', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '160 days'),
('b0000019-0000-0000-0000-000000000019', 'NFC-019-C7D8E9', 'member', 'a0000019-0000-0000-0000-000000000019', 'active', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '155 days'),
('b0000020-0000-0000-0000-000000000020', 'NFC-020-F1G2H3', 'member', 'a0000020-0000-0000-0000-000000000020', 'active', NOW() - INTERVAL '20 days', NOW() - INTERVAL '150 days'),
('b0000021-0000-0000-0000-000000000021', 'NFC-021-I4J5K6', 'member', 'a0000021-0000-0000-0000-000000000021', 'active', NOW() - INTERVAL '21 days', NOW() - INTERVAL '145 days'),
('b0000022-0000-0000-0000-000000000022', 'NFC-022-L7M8N9', 'member', 'a0000022-0000-0000-0000-000000000022', 'active', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '200 days'),
('b0000023-0000-0000-0000-000000000023', 'NFC-023-O1P2Q3', 'member', 'a0000023-0000-0000-0000-000000000023', 'active', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '195 days'),
('b0000024-0000-0000-0000-000000000024', 'NFC-024-R4S5T6', 'member', 'a0000024-0000-0000-0000-000000000024', 'active', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '190 days'),
('b0000025-0000-0000-0000-000000000025', 'NFC-025-U7V8W9', 'member', 'a0000025-0000-0000-0000-000000000025', 'active', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '185 days'),

-- Unassigned badges (for visitors and future assignments)
('b0000026-0000-0000-0000-000000000026', 'NFC-TEMP-001', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '30 days'),
('b0000027-0000-0000-0000-000000000027', 'NFC-TEMP-002', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '30 days'),
('b0000028-0000-0000-0000-000000000028', 'NFC-TEMP-003', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '30 days'),
('b0000029-0000-0000-0000-000000000029', 'NFC-TEMP-004', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '30 days'),
('b0000030-0000-0000-0000-000000000030', 'NFC-TEMP-005', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '30 days'),
('b0000031-0000-0000-0000-000000000031', 'NFC-TEMP-006', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '30 days'),
('b0000032-0000-0000-0000-000000000032', 'NFC-TEMP-007', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '30 days'),
('b0000033-0000-0000-0000-000000000033', 'NFC-TEMP-008', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '30 days'),
('b0000034-0000-0000-0000-000000000034', 'NFC-TEMP-009', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '30 days'),
('b0000035-0000-0000-0000-000000000035', 'NFC-TEMP-010', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '30 days'),

-- Lost/disabled badges for testing
('b0000036-0000-0000-0000-000000000036', 'NFC-LOST-001', 'member', 'a0000026-0000-0000-0000-000000000026', 'lost', NOW() - INTERVAL '100 days', NOW() - INTERVAL '100 days'),
('b0000037-0000-0000-0000-000000000037', 'NFC-DISABLED-001', 'unassigned', NULL, 'disabled', NULL, NOW() - INTERVAL '60 days'),

-- Event badges (for future use)
('b0000038-0000-0000-0000-000000000038', 'NFC-EVENT-001', 'event', NULL, 'active', NULL, NOW() - INTERVAL '10 days'),
('b0000039-0000-0000-0000-000000000039', 'NFC-EVENT-002', 'event', NULL, 'active', NULL, NOW() - INTERVAL '10 days'),
('b0000040-0000-0000-0000-000000000040', 'NFC-EVENT-003', 'event', NULL, 'active', NULL, NOW() - INTERVAL '10 days'),

-- Additional unassigned badges
('b0000041-0000-0000-0000-000000000041', 'NFC-SPARE-001', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '5 days'),
('b0000042-0000-0000-0000-000000000042', 'NFC-SPARE-002', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '5 days'),
('b0000043-0000-0000-0000-000000000043', 'NFC-SPARE-003', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '5 days'),
('b0000044-0000-0000-0000-000000000044', 'NFC-SPARE-004', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '5 days'),
('b0000045-0000-0000-0000-000000000045', 'NFC-SPARE-005', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '5 days'),
('b0000046-0000-0000-0000-000000000046', 'NFC-SPARE-006', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '5 days'),
('b0000047-0000-0000-0000-000000000047', 'NFC-SPARE-007', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '5 days'),
('b0000048-0000-0000-0000-000000000048', 'NFC-SPARE-008', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '5 days'),
('b0000049-0000-0000-0000-000000000049', 'NFC-SPARE-009', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '5 days'),
('b0000050-0000-0000-0000-000000000050', 'NFC-SPARE-010', 'unassigned', NULL, 'active', NULL, NOW() - INTERVAL '5 days');

-- ============================================================================
-- CHECK-INS (Sample attendance data)
-- ============================================================================

-- Today's check-ins
INSERT INTO checkins (member_id, badge_id, direction, timestamp, kiosk_id, synced) VALUES
-- Morning arrivals
('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'in', NOW() - INTERVAL '2 hours', 'KIOSK-MAIN-01', true),
('a0000002-0000-0000-0000-000000000002', 'b0000002-0000-0000-0000-000000000002', 'in', NOW() - INTERVAL '3 hours', 'KIOSK-MAIN-01', true),
('a0000003-0000-0000-0000-000000000003', 'b0000003-0000-0000-0000-000000000003', 'in', NOW() - INTERVAL '1 hour', 'KIOSK-MAIN-01', true),
('a0000004-0000-0000-0000-000000000004', 'b0000004-0000-0000-0000-000000000004', 'in', NOW() - INTERVAL '4 hours', 'KIOSK-MAIN-02', true),
('a0000005-0000-0000-0000-000000000005', 'b0000005-0000-0000-0000-000000000005', 'in', NOW() - INTERVAL '5 hours', 'KIOSK-MAIN-02', true),
('a0000006-0000-0000-0000-000000000006', 'b0000006-0000-0000-0000-000000000006', 'in', NOW() - INTERVAL '2 hours', 'KIOSK-SIDE-01', true),
('a0000010-0000-0000-0000-000000000010', 'b0000010-0000-0000-0000-000000000010', 'in', NOW() - INTERVAL '1 hour', 'KIOSK-MAIN-01', true),
('a0000011-0000-0000-0000-000000000011', 'b0000011-0000-0000-0000-000000000011', 'in', NOW() - INTERVAL '2 hours', 'KIOSK-MAIN-01', true),
('a0000012-0000-0000-0000-000000000012', 'b0000012-0000-0000-0000-000000000012', 'in', NOW() - INTERVAL '3 hours', 'KIOSK-MAIN-02', true),
('a0000013-0000-0000-0000-000000000013', 'b0000013-0000-0000-0000-000000000013', 'in', NOW() - INTERVAL '4 hours', 'KIOSK-MAIN-02', true),
('a0000016-0000-0000-0000-000000000016', 'b0000016-0000-0000-0000-000000000016', 'in', NOW() - INTERVAL '1 hour', 'KIOSK-MAIN-01', true),
('a0000017-0000-0000-0000-000000000017', 'b0000017-0000-0000-0000-000000000017', 'in', NOW() - INTERVAL '2 hours', 'KIOSK-MAIN-01', true),
('a0000018-0000-0000-0000-000000000018', 'b0000018-0000-0000-0000-000000000018', 'in', NOW() - INTERVAL '3 hours', 'KIOSK-MAIN-02', true),
('a0000019-0000-0000-0000-000000000019', 'b0000019-0000-0000-0000-000000000019', 'in', NOW() - INTERVAL '4 hours', 'KIOSK-MAIN-02', true),
('a0000022-0000-0000-0000-000000000022', 'b0000022-0000-0000-0000-000000000022', 'in', NOW() - INTERVAL '1 hour', 'KIOSK-MAIN-01', true),
('a0000023-0000-0000-0000-000000000023', 'b0000023-0000-0000-0000-000000000023', 'in', NOW() - INTERVAL '2 hours', 'KIOSK-MAIN-01', true),
('a0000024-0000-0000-0000-000000000024', 'b0000024-0000-0000-0000-000000000024', 'in', NOW() - INTERVAL '3 hours', 'KIOSK-MAIN-02', true),
('a0000025-0000-0000-0000-000000000025', 'b0000025-0000-0000-0000-000000000025', 'in', NOW() - INTERVAL '4 hours', 'KIOSK-MAIN-02', true);

-- Yesterday's check-ins (complete day with in/out)
INSERT INTO checkins (member_id, badge_id, direction, timestamp, kiosk_id, synced) VALUES
('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'in', NOW() - INTERVAL '1 day 8 hours', 'KIOSK-MAIN-01', true),
('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'out', NOW() - INTERVAL '1 day 30 minutes', 'KIOSK-MAIN-01', true),
('a0000002-0000-0000-0000-000000000002', 'b0000002-0000-0000-0000-000000000002', 'in', NOW() - INTERVAL '1 day 7 hours 30 minutes', 'KIOSK-MAIN-01', true),
('a0000002-0000-0000-0000-000000000002', 'b0000002-0000-0000-0000-000000000002', 'out', NOW() - INTERVAL '1 day 1 hour', 'KIOSK-MAIN-01', true),
('a0000003-0000-0000-0000-000000000003', 'b0000003-0000-0000-0000-000000000003', 'in', NOW() - INTERVAL '1 day 8 hours 15 minutes', 'KIOSK-MAIN-02', true),
('a0000003-0000-0000-0000-000000000003', 'b0000003-0000-0000-0000-000000000003', 'out', NOW() - INTERVAL '1 day 45 minutes', 'KIOSK-MAIN-02', true);

-- ============================================================================
-- ADMIN USERS
-- ============================================================================

-- HIGH-2 FIX: Strong passwords that meet security policy requirements
-- Password: Admin123!@#Dev (12+ chars, uppercase, lowercase, number, special char)
-- Password: Viewer123!@#Dev (12+ chars, uppercase, lowercase, number, special char)
INSERT INTO admin_users (id, username, email, password_hash, full_name, role, last_login, created_at) VALUES
('c0000001-0000-0000-0000-000000000001', 'admin', 'admin@sentinel.local', '$2b$12$WKrA7Bqcpsky5QBmPc7TReGp2.BxEKDy2ZxLiiQ0cqi3H52zfPq.e', 'System Administrator', 'admin', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '180 days'),
('c0000002-0000-0000-0000-000000000002', 'viewer', 'viewer@sentinel.local', '$2b$12$vr9oekUrI11ttciuRf5qIeU8R.1omYMf2IrGjhNrU29cWnICrE38C', 'Guest Viewer', 'viewer', NOW() - INTERVAL '2 days', NOW() - INTERVAL '150 days');

-- ============================================================================
-- AUDIT LOG (Sample entries)
-- ============================================================================

INSERT INTO audit_log (admin_user_id, action, entity_type, entity_id, details, ip_address, created_at) VALUES
('c0000001-0000-0000-0000-000000000001', 'CREATE_MEMBER', 'member', 'a0000025-0000-0000-0000-000000000025', '{"service_number": "V567892", "rank": "CPO1", "name": "Samantha King"}'::jsonb, '192.168.1.100', NOW() - INTERVAL '185 days'),
('c0000001-0000-0000-0000-000000000001', 'UPDATE_BADGE_STATUS', 'badge', 'b0000036-0000-0000-0000-000000000036', '{"old_status": "active", "new_status": "lost", "reason": "Reported lost by member"}'::jsonb, '192.168.1.100', NOW() - INTERVAL '100 days'),
('c0000001-0000-0000-0000-000000000001', 'DISABLE_BADGE', 'badge', 'b0000037-0000-0000-0000-000000000037', '{"reason": "Damaged - physical defect"}'::jsonb, '192.168.1.100', NOW() - INTERVAL '60 days'),
('c0000001-0000-0000-0000-000000000001', 'UPDATE_MEMBER_STATUS', 'member', 'a0000026-0000-0000-0000-000000000026', '{"old_status": "active", "new_status": "inactive", "reason": "Posted to different unit"}'::jsonb, '192.168.1.100', NOW() - INTERVAL '100 days'),
('c0000002-0000-0000-0000-000000000002', 'VIEW_REPORT', 'report', NULL, '{"report_type": "attendance_summary", "date_range": "2025-11-01 to 2025-11-30"}'::jsonb, '192.168.1.105', NOW() - INTERVAL '2 days'),
('c0000001-0000-0000-0000-000000000001', 'CREATE_BADGE', 'badge', 'b0000050-0000-0000-0000-000000000050', '{"serial_number": "NFC-SPARE-010", "assignment_type": "unassigned"}'::jsonb, '192.168.1.100', NOW() - INTERVAL '5 days'),
('c0000001-0000-0000-0000-000000000001', 'ASSIGN_BADGE', 'badge', 'b0000025-0000-0000-0000-000000000025', '{"badge_serial": "NFC-025-U7V8W9", "assigned_to": "CPO1 Samantha King", "member_id": "a0000025-0000-0000-0000-000000000025"}'::jsonb, '192.168.1.100', NOW() - INTERVAL '185 days');

-- ============================================================================
-- EVENTS (Sample event for testing Phase 7)
-- ============================================================================

INSERT INTO events (id, name, code, description, start_date, end_date, status, auto_expire_badges, created_by, created_at) VALUES
('e0000001-0000-0000-0000-000000000001', 'Annual Training Exercise', 'ANNEX-2025', 'Annual unit training exercise with external participants', '2025-12-01', '2025-12-15', 'draft', true, 'c0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '30 days'),
('e0000002-0000-0000-0000-000000000002', 'Naval Reserve Day', 'NRD-2025', 'Community engagement and recruitment event', '2026-01-15', '2026-01-15', 'draft', true, 'c0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '20 days');

-- ============================================================================
-- VISITORS (Sample visitor records)
-- ============================================================================

-- Active visitor (checked in, not checked out)
INSERT INTO visitors (id, name, organization, visit_type, visit_reason, event_id, host_member_id, check_in_time, check_out_time, temporary_badge_id, kiosk_id, created_at) VALUES
('f0000001-0000-0000-0000-000000000001', 'John Smith', 'Acme Contractors Ltd.', 'contractor', 'Facility maintenance and repairs', NULL, 'a0000010-0000-0000-0000-000000000010', NOW() - INTERVAL '2 hours', NULL, 'b0000026-0000-0000-0000-000000000026', 'KIOSK-MAIN-01', NOW() - INTERVAL '2 hours'),
('f0000002-0000-0000-0000-000000000002', 'Jane Doe', 'University of Victoria', 'recruitment', 'Career fair - recruiting presentation', NULL, 'a0000016-0000-0000-0000-000000000016', NOW() - INTERVAL '1 hour', NULL, 'b0000027-0000-0000-0000-000000000027', 'KIOSK-MAIN-01', NOW() - INTERVAL '1 hour');

-- Completed visits (checked in and out)
INSERT INTO visitors (id, name, organization, visit_type, visit_reason, event_id, host_member_id, check_in_time, check_out_time, temporary_badge_id, kiosk_id, created_at) VALUES
('f0000003-0000-0000-0000-000000000003', 'Robert Johnson', 'DND Headquarters', 'official', 'Quarterly inspection', NULL, 'a0000022-0000-0000-0000-000000000022', NOW() - INTERVAL '1 day 6 hours', NOW() - INTERVAL '1 day 2 hours', 'b0000028-0000-0000-0000-000000000028', 'KIOSK-MAIN-01', NOW() - INTERVAL '1 day 6 hours'),
('f0000004-0000-0000-0000-000000000004', 'Maria Garcia', 'Local High School', 'recruitment', 'Student tour and Q&A session', NULL, 'a0000017-0000-0000-0000-000000000017', NOW() - INTERVAL '2 days 3 hours', NOW() - INTERVAL '2 days 1 hour', 'b0000029-0000-0000-0000-000000000029', 'KIOSK-MAIN-02', NOW() - INTERVAL '2 days 3 hours'),
('f0000005-0000-0000-0000-000000000005', 'David Chen', 'Tech Solutions Inc.', 'contractor', 'Network equipment installation', NULL, 'a0000011-0000-0000-0000-000000000011', NOW() - INTERVAL '3 days 5 hours', NOW() - INTERVAL '3 days 30 minutes', 'b0000030-0000-0000-0000-000000000030', 'KIOSK-SIDE-01', NOW() - INTERVAL '3 days 5 hours');

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Comment out for actual seeding)
-- ============================================================================

-- SELECT COUNT(*) as division_count FROM divisions;
-- SELECT COUNT(*) as member_count FROM members WHERE status = 'active';
-- SELECT COUNT(*) as badge_count FROM badges;
-- SELECT COUNT(*) as checkin_count FROM checkins;
-- SELECT COUNT(*) as visitor_count FROM visitors;
-- SELECT COUNT(*) as admin_count FROM admin_users;
-- SELECT COUNT(*) as audit_count FROM audit_log;
-- SELECT * FROM active_members_view LIMIT 5;
-- SELECT * FROM member_current_status_view LIMIT 5;
-- SELECT * FROM active_visitors_view;
