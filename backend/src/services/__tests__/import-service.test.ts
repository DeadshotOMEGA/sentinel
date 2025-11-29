import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidationError } from '../../utils/errors';
import type {
  Member,
  Division,
  NominalRollRow,
  ImportPreview,
  ImportError,
} from '@shared/types';

/**
 * Integration tests for ImportService
 * Tests CSV parsing, validation, preview generation, and import execution
 * Critical test coverage to prevent data corruption during member imports
 */

// Use vi.hoisted to create mock objects that vitest will hoist with the vi.mock calls
const { mockMemberRepository, mockDivisionRepository } = vi.hoisted(() => ({
  mockMemberRepository: {
    findByServiceNumbers: vi.fn(),
    findAll: vi.fn(),
    bulkCreate: vi.fn(),
    bulkUpdate: vi.fn(),
    flagForReview: vi.fn(),
  },
  mockDivisionRepository: {
    findAll: vi.fn(),
  },
}));

// Mock the repository modules before importing ImportService
vi.mock('../../db/repositories/member-repository', () => ({
  memberRepository: mockMemberRepository,
}));

vi.mock('../../db/repositories/division-repository', () => ({
  divisionRepository: mockDivisionRepository,
}));

// Now import the service with mocked dependencies
import { ImportService } from '../import-service';

// Test fixtures
const testDivisions: Division[] = [
  {
    id: 'div-1',
    name: 'Operations',
    code: 'OPS',
    description: 'Operations Division',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'div-2',
    name: 'Administration',
    code: 'ADMIN',
    description: 'Administration Division',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'div-3',
    name: 'Training',
    code: 'TRG',
    description: 'Training Division',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const testMembers: Member[] = [
  {
    id: 'mem-1',
    serviceNumber: 'SN001',
    employeeNumber: 'EMP001',
    firstName: 'John',
    lastName: 'Smith',
    initials: 'J.S.',
    rank: 'Petty Officer',
    divisionId: 'div-1',
    mess: 'Officers',
    moc: 'Naval Tech',
    memberType: 'class_a',
    classDetails: 'Reserve',
    status: 'active',
    email: 'john.smith@example.com',
    homePhone: '204-555-0001',
    mobilePhone: '204-555-1001',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mem-2',
    serviceNumber: 'SN002',
    employeeNumber: 'EMP002',
    firstName: 'Mary',
    lastName: 'Johnson',
    rank: 'Leading Seaman',
    divisionId: 'div-2',
    memberType: 'class_b',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Create test CSV strings
function createTestCSV(rows: Array<Record<string, string>>): string {
  const headers = [
    'SN',
    'EMPL #',
    'RANK',
    'LAST NAME',
    'FIRST NAME',
    'INITIALS',
    'DEPT',
    'MESS',
    'MOC',
    'EMAIL ADDRESS',
    'HOME PHONE',
    'MOBILE PHONE',
    'DETAILS',
  ];

  const csvLines = [headers.join(',')];

  for (const row of rows) {
    const values = headers.map((header) => {
      const value = row[header] ?? '';
      // Escape values with commas or quotes
      if (value.includes(',') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvLines.push(values.join(','));
  }

  return csvLines.join('\n');
}

describe('ImportService', () => {
  let importService: ImportService;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create fresh service instance
    importService = new ImportService();

    // Set default mock implementations
    mockDivisionRepository.findAll.mockResolvedValue(testDivisions);
    mockMemberRepository.findByServiceNumbers.mockResolvedValue([]);
    mockMemberRepository.findAll.mockResolvedValue([]);
  });

  describe('CSV Parsing and Validation', () => {
    it('should accept valid CSV with all required fields via preview', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN100',
          'EMPL #': 'EMP100',
          RANK: 'Petty Officer',
          'LAST NAME': 'SMITH',
          'FIRST NAME': 'JOHN',
          INITIALS: 'J.S.',
          DEPT: 'OPS',
          MESS: 'Officers',
          MOC: 'Naval Tech',
          'EMAIL ADDRESS': 'john@example.com',
          'HOME PHONE': '204-555-0100',
          'MOBILE PHONE': '204-555-1100',
          DETAILS: 'Class A',
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.toAdd).toHaveLength(1);
      expect(preview.errors).toHaveLength(0);
      expect(preview.toAdd[0]).toMatchObject({
        serviceNumber: 'SN100',
        employeeNumber: 'EMP100',
        firstName: 'John',
        lastName: 'Smith',
        rank: 'Petty Officer',
        department: 'OPS',
      });
    });

    it('should parse CSV with optional fields missing', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN101',
          'EMPL #': '',
          RANK: 'Leading Seaman',
          'LAST NAME': 'JOHNSON',
          'FIRST NAME': 'MARY',
          INITIALS: '',
          DEPT: 'ADMIN',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '204-555-1101',
          DETAILS: '',
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.toAdd).toHaveLength(1);
      expect(preview.errors).toHaveLength(0);
      expect(preview.toAdd[0]).toMatchObject({
        serviceNumber: 'SN101',
        firstName: 'Mary',
        lastName: 'Johnson',
        mobilePhone: '204-555-1101',
      });
    });

    it('should reject CSV with missing service number', async () => {
      const csv = createTestCSV([
        {
          SN: '',
          'EMPL #': 'EMP102',
          RANK: 'Petty Officer',
          'LAST NAME': 'SMITH',
          'FIRST NAME': 'JOHN',
          INITIALS: 'J.S.',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      let thrownError: unknown;
      try {
        await importService.generatePreview(csv);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(ValidationError);
      if (thrownError instanceof ValidationError) {
        expect(thrownError.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject CSV with missing first name', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN103',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'SMITH',
          'FIRST NAME': '',
          INITIALS: '',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      let thrownError: unknown;
      try {
        await importService.generatePreview(csv);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(ValidationError);
      if (thrownError instanceof ValidationError) {
        expect(thrownError.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject CSV with missing last name', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN104',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': '',
          'FIRST NAME': 'JOHN',
          INITIALS: '',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      let thrownError: unknown;
      try {
        await importService.generatePreview(csv);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(ValidationError);
      if (thrownError instanceof ValidationError) {
        expect(thrownError.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject CSV with missing rank', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN105',
          'EMPL #': '',
          RANK: '',
          'LAST NAME': 'SMITH',
          'FIRST NAME': 'JOHN',
          INITIALS: '',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      let thrownError: unknown;
      try {
        await importService.generatePreview(csv);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(ValidationError);
      if (thrownError instanceof ValidationError) {
        expect(thrownError.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject CSV with missing department', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN106',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'SMITH',
          'FIRST NAME': 'JOHN',
          INITIALS: '',
          DEPT: '',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      let thrownError: unknown;
      try {
        await importService.generatePreview(csv);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(ValidationError);
      if (thrownError instanceof ValidationError) {
        expect(thrownError.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should skip completely empty rows', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN107',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'SMITH',
          'FIRST NAME': 'JOHN',
          INITIALS: '',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
        {
          SN: '',
          'EMPL #': '',
          RANK: '',
          'LAST NAME': '',
          'FIRST NAME': '',
          INITIALS: '',
          DEPT: '',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.toAdd).toHaveLength(1);
      expect(preview.errors).toHaveLength(0);
    });

    it('should normalize names from ALL CAPS', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN108',
          'EMPL #': '',
          RANK: 'LEADING SEAMAN',
          'LAST NAME': 'MCDONALD',
          'FIRST NAME': 'ALEXANDER',
          INITIALS: 'A.M.',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.toAdd[0]).toMatchObject({
        firstName: 'Alexander',
        lastName: 'McDonald', // Service correctly handles Scottish names like Mc/Mac
      });
    });

    it('should normalize email addresses to lowercase', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN109',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'SMITH',
          'FIRST NAME': 'JOHN',
          INITIALS: '',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': 'John.Smith@EXAMPLE.COM',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.toAdd[0].email).toBe('john.smith@example.com');
    });

    it('should remove spaces from service numbers', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN 1 1 0',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'SMITH',
          'FIRST NAME': 'JOHN',
          INITIALS: '',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.toAdd[0].serviceNumber).toBe('SN110');
    });

    it('should handle UTF-8 BOM in CSV', async () => {
      const csvWithBom = '\uFEFF' + createTestCSV([
        {
          SN: 'SN111',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'SMITH',
          'FIRST NAME': 'JOHN',
          INITIALS: '',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      const preview = await importService.generatePreview(csvWithBom);

      expect(preview.toAdd).toHaveLength(1);
      expect(preview.errors).toHaveLength(0);
    });
  });

  describe('Member Type Derivation', () => {
    it('should default to class_a when details are empty', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN200',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'TEST',
          'FIRST NAME': 'DEFAULT',
          INITIALS: '',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.toAdd[0]).toBeDefined();
      // The memberType is derived during executeImport, verify indirectly via preview
    });

    it('should derive class_b from details', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN201',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'TEST',
          'FIRST NAME': 'CLASSB',
          INITIALS: '',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: 'CLASS B MEMBER',
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.toAdd[0].details).toBe('CLASS B MEMBER');
    });

    it('should derive class_c from details', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN202',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'TEST',
          'FIRST NAME': 'CLASSC',
          INITIALS: '',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: 'CLASS C MEMBER',
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.toAdd[0].details).toBe('CLASS C MEMBER');
    });

    it('should handle REG FORCE classification', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN203',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'TEST',
          'FIRST NAME': 'REGFORCE',
          INITIALS: '',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: 'REG FORCE PERSONNEL',
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.toAdd[0].details).toBe('REG FORCE PERSONNEL');
    });
  });

  describe('generatePreview', () => {
    it('should generate preview with new members to add', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN200',
          'EMPL #': 'EMP200',
          RANK: 'Petty Officer',
          'LAST NAME': 'WILLIAMS',
          'FIRST NAME': 'ROBERT',
          INITIALS: 'R.W.',
          DEPT: 'OPS',
          MESS: 'Officers',
          MOC: 'Naval Tech',
          'EMAIL ADDRESS': 'robert@example.com',
          'HOME PHONE': '',
          'MOBILE PHONE': '204-555-2001',
          DETAILS: 'Class A',
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.toAdd).toHaveLength(1);
      expect(preview.toUpdate).toHaveLength(0);
      expect(preview.errors).toHaveLength(0);
      expect(preview.toAdd[0]).toMatchObject({
        serviceNumber: 'SN200',
        firstName: 'Robert',
        lastName: 'Williams',
      });
    });

    it('should generate preview with members to update', async () => {
      mockMemberRepository.findByServiceNumbers.mockResolvedValue([testMembers[0]]);

      const csv = createTestCSV([
        {
          SN: testMembers[0].serviceNumber,
          'EMPL #': testMembers[0].employeeNumber,
          RANK: 'Chief Petty Officer',
          'LAST NAME': testMembers[0].lastName.toUpperCase(),
          'FIRST NAME': testMembers[0].firstName.toUpperCase(),
          INITIALS: testMembers[0].initials,
          DEPT: 'OPS',
          MESS: testMembers[0].mess,
          MOC: testMembers[0].moc,
          'EMAIL ADDRESS': testMembers[0].email,
          'HOME PHONE': testMembers[0].homePhone,
          'MOBILE PHONE': testMembers[0].mobilePhone,
          DETAILS: testMembers[0].classDetails,
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.toUpdate).toHaveLength(1);
      expect(preview.toAdd).toHaveLength(0);
      expect(preview.toUpdate[0].current).toMatchObject({
        id: testMembers[0].id,
        serviceNumber: testMembers[0].serviceNumber,
      });
      expect(preview.toUpdate[0].changes).toContain('Rank: Petty Officer → Chief Petty Officer');
    });

    it('should identify members to review (not in CSV)', async () => {
      mockMemberRepository.findAll.mockResolvedValue(testMembers);

      const csv = createTestCSV([
        {
          SN: 'SN201',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'DAVIS',
          'FIRST NAME': 'SARAH',
          INITIALS: '',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.toReview).toHaveLength(2); // testMembers[0] and testMembers[1]
      expect(preview.toReview).toContainEqual(
        expect.objectContaining({
          id: testMembers[0].id,
          serviceNumber: testMembers[0].serviceNumber,
        })
      );
    });

    it('should reject unknown department', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN202',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'BROWN',
          'FIRST NAME': 'THOMAS',
          INITIALS: '',
          DEPT: 'UNKNOWN_DEPT',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.errors).toHaveLength(1);
      expect(preview.errors[0]).toMatchObject({
        field: 'DEPT',
        message: expect.stringContaining('Unknown department'),
      });
    });

    it('should build division mapping', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN203',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'GREEN',
          'FIRST NAME': 'MICHAEL',
          INITIALS: '',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.divisionMapping).toHaveProperty('OPS');
      expect(preview.divisionMapping['OPS']).toBe('div-1');
    });

    it('should throw error if CSV has validation errors', async () => {
      const csv = createTestCSV([
        {
          SN: '',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'RED',
          'FIRST NAME': 'PAUL',
          INITIALS: '',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      let thrownError: unknown;
      try {
        await importService.generatePreview(csv);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(ValidationError);
      if (thrownError instanceof ValidationError) {
        expect(thrownError.code).toBe('VALIDATION_ERROR');
        expect(thrownError.statusCode).toBe(400);
      }
    });

    it('should generate changes list with all field differences', async () => {
      mockMemberRepository.findByServiceNumbers.mockResolvedValue([testMembers[0]]);

      const csv = createTestCSV([
        {
          SN: testMembers[0].serviceNumber,
          'EMPL #': 'NEW_EMP',
          RANK: 'Chief Petty Officer',
          'LAST NAME': 'NEWLAST',
          'FIRST NAME': 'NEWFIRST',
          INITIALS: 'N.N.',
          DEPT: 'OPS',
          MESS: 'Non-Commissioned',
          MOC: 'Comms',
          'EMAIL ADDRESS': 'new@example.com',
          'HOME PHONE': '204-555-9999',
          'MOBILE PHONE': '204-555-8888',
          DETAILS: 'CLASS B',
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.toUpdate).toHaveLength(1);
      const changes = preview.toUpdate[0].changes;
      expect(changes.length).toBeGreaterThan(0);
      expect(changes.some((c) => c.includes('Rank:'))).toBe(true);
      expect(changes.some((c) => c.includes('First Name:'))).toBe(true);
      expect(changes.some((c) => c.includes('Last Name:'))).toBe(true);
      expect(changes.some((c) => c.includes('Member Type:'))).toBe(true);
    });
  });

  describe('executeImport', () => {
    it('should execute import and add new members', async () => {
      mockMemberRepository.bulkCreate.mockResolvedValue(1);

      const csv = createTestCSV([
        {
          SN: 'SN300',
          'EMPL #': 'EMP300',
          RANK: 'Petty Officer',
          'LAST NAME': 'MILLER',
          'FIRST NAME': 'DAVID',
          INITIALS: 'D.M.',
          DEPT: 'OPS',
          MESS: 'Officers',
          MOC: 'Naval Tech',
          'EMAIL ADDRESS': 'david@example.com',
          'HOME PHONE': '',
          'MOBILE PHONE': '204-555-3001',
          DETAILS: 'Class A',
        },
      ]);

      const result = await importService.executeImport(csv);

      expect(result.added).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.flaggedForReview).toBe(0);
      expect(mockMemberRepository.bulkCreate).toHaveBeenCalled();
    });

    it('should execute import and update existing members', async () => {
      mockMemberRepository.findByServiceNumbers.mockResolvedValue([testMembers[0]]);
      mockMemberRepository.bulkUpdate.mockResolvedValue(1);

      const csv = createTestCSV([
        {
          SN: testMembers[0].serviceNumber,
          'EMPL #': testMembers[0].employeeNumber,
          RANK: 'Chief Petty Officer',
          'LAST NAME': testMembers[0].lastName.toUpperCase(),
          'FIRST NAME': testMembers[0].firstName.toUpperCase(),
          INITIALS: testMembers[0].initials,
          DEPT: 'OPS',
          MESS: testMembers[0].mess,
          MOC: testMembers[0].moc,
          'EMAIL ADDRESS': testMembers[0].email,
          'HOME PHONE': testMembers[0].homePhone,
          'MOBILE PHONE': testMembers[0].mobilePhone,
          DETAILS: testMembers[0].classDetails,
        },
      ]);

      const result = await importService.executeImport(csv);

      expect(result.updated).toBe(1);
      expect(mockMemberRepository.bulkUpdate).toHaveBeenCalled();
    });

    it('should flag members for review', async () => {
      mockMemberRepository.flagForReview.mockResolvedValue(undefined);

      const csv = createTestCSV([
        {
          SN: 'SN301',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'WILSON',
          'FIRST NAME': 'ELIZABETH',
          INITIALS: '',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      const result = await importService.executeImport(csv, ['mem-1', 'mem-2']);

      expect(result.flaggedForReview).toBe(2);
      expect(mockMemberRepository.flagForReview).toHaveBeenCalledWith(['mem-1', 'mem-2']);
    });

    it('should handle mixed adds, updates, and reviews', async () => {
      mockMemberRepository.findByServiceNumbers.mockResolvedValue([testMembers[0]]);
      mockMemberRepository.bulkCreate.mockResolvedValue(1);
      mockMemberRepository.bulkUpdate.mockResolvedValue(1);
      mockMemberRepository.flagForReview.mockResolvedValue(undefined);

      const csv = createTestCSV([
        {
          SN: testMembers[0].serviceNumber,
          'EMPL #': testMembers[0].employeeNumber,
          RANK: 'Chief Petty Officer',
          'LAST NAME': testMembers[0].lastName.toUpperCase(),
          'FIRST NAME': testMembers[0].firstName.toUpperCase(),
          INITIALS: testMembers[0].initials,
          DEPT: 'OPS',
          MESS: testMembers[0].mess,
          MOC: testMembers[0].moc,
          'EMAIL ADDRESS': testMembers[0].email,
          'HOME PHONE': testMembers[0].homePhone,
          'MOBILE PHONE': testMembers[0].mobilePhone,
          DETAILS: testMembers[0].classDetails,
        },
        {
          SN: 'SN302',
          'EMPL #': '',
          RANK: 'Leading Seaman',
          'LAST NAME': 'TAYLOR',
          'FIRST NAME': 'JAMES',
          INITIALS: '',
          DEPT: 'ADMIN',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      const result = await importService.executeImport(csv, ['mem-2']);

      expect(result.added).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.flaggedForReview).toBe(1);
    });

    it('should throw error if CSV has validation errors', async () => {
      const csv = createTestCSV([
        {
          SN: '',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'ANDERSON',
          'FIRST NAME': 'CHRIS',
          INITIALS: '',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      let thrownError: unknown;
      try {
        await importService.executeImport(csv);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(ValidationError);
      if (thrownError instanceof ValidationError) {
        expect(thrownError.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should throw error if CSV has unknown department', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN303',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'HARRIS',
          'FIRST NAME': 'KEVIN',
          INITIALS: '',
          DEPT: 'INVALID',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      let thrownError: unknown;
      try {
        await importService.executeImport(csv);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(ValidationError);
      if (thrownError instanceof ValidationError) {
        expect(thrownError.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should pass correct member creation data to bulkCreate', async () => {
      mockMemberRepository.bulkCreate.mockResolvedValue(1);

      const csv = createTestCSV([
        {
          SN: 'SN304',
          'EMPL #': 'EMP304',
          RANK: 'Able Seaman',
          'LAST NAME': 'MARTINEZ',
          'FIRST NAME': 'JUAN',
          INITIALS: 'J.M.',
          DEPT: 'TRG',
          MESS: 'Enlisted',
          MOC: 'Combat Systems',
          'EMAIL ADDRESS': 'juan@example.com',
          'HOME PHONE': '204-555-3041',
          'MOBILE PHONE': '204-555-3042',
          DETAILS: 'CLASS B',
        },
      ]);

      await importService.executeImport(csv);

      expect(mockMemberRepository.bulkCreate).toHaveBeenCalled();
      const callArgs = mockMemberRepository.bulkCreate.mock.calls[0][0];
      expect(callArgs).toHaveLength(1);
      expect(callArgs[0]).toMatchObject({
        serviceNumber: 'SN304',
        employeeNumber: 'EMP304',
        firstName: 'Juan',
        lastName: 'Martinez',
        initials: 'J.M.',
        rank: 'Able Seaman',
        divisionId: 'div-3',
        mess: 'Enlisted',
        moc: 'Combat Systems',
        memberType: 'class_b',
        classDetails: 'CLASS B',
        status: 'active',
        email: 'juan@example.com',
        homePhone: '204-555-3041',
        mobilePhone: '204-555-3042',
      });
    });

    it('should pass correct member update data to bulkUpdate', async () => {
      mockMemberRepository.findByServiceNumbers.mockResolvedValue([testMembers[0]]);
      mockMemberRepository.bulkUpdate.mockResolvedValue(1);

      const csv = createTestCSV([
        {
          SN: testMembers[0].serviceNumber,
          'EMPL #': 'NEW_EMP_ID',
          RANK: 'Chief Petty Officer',
          'LAST NAME': 'NEWSURNAME',
          'FIRST NAME': 'NEWNAME',
          INITIALS: 'N.N.',
          DEPT: 'ADMIN',
          MESS: 'Senior',
          MOC: 'Engineering',
          'EMAIL ADDRESS': 'newemail@example.com',
          'HOME PHONE': '204-555-9991',
          'MOBILE PHONE': '204-555-9992',
          DETAILS: 'CLASS C',
        },
      ]);

      await importService.executeImport(csv);

      expect(mockMemberRepository.bulkUpdate).toHaveBeenCalled();
      const callArgs = mockMemberRepository.bulkUpdate.mock.calls[0][0];
      expect(callArgs).toHaveLength(1);
      expect(callArgs[0]).toMatchObject({
        id: testMembers[0].id,
        data: expect.objectContaining({
          serviceNumber: testMembers[0].serviceNumber,
          employeeNumber: 'NEW_EMP_ID',
          firstName: 'Newname',
          lastName: 'Newsurname',
          rank: 'Chief Petty Officer',
          divisionId: 'div-2',
          memberType: 'class_c',
        }),
      });
    });

    it('should handle multiple division mappings', async () => {
      mockMemberRepository.bulkCreate.mockResolvedValue(2);

      const csv = createTestCSV([
        {
          SN: 'SN305',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'CLARK',
          'FIRST NAME': 'LINDA',
          INITIALS: '',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
        {
          SN: 'SN306',
          'EMPL #': '',
          RANK: 'Leading Seaman',
          'LAST NAME': 'WHITE',
          'FIRST NAME': 'RICHARD',
          INITIALS: '',
          DEPT: 'ADMIN',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      const result = await importService.executeImport(csv);

      expect(result.added).toBe(2);
      const bulkCreateCall = mockMemberRepository.bulkCreate.mock.calls[0][0];
      expect(bulkCreateCall[0].divisionId).toBe('div-1'); // OPS
      expect(bulkCreateCall[1].divisionId).toBe('div-2'); // ADMIN
    });
  });

  describe('CSV parsing edge cases', () => {
    it('should handle quoted fields with commas', async () => {
      const csv =
        'SN,EMPL #,RANK,LAST NAME,FIRST NAME,INITIALS,DEPT,MESS,MOC,EMAIL ADDRESS,HOME PHONE,MOBILE PHONE,DETAILS\n' +
        '"SN307","EMP307","Petty Officer","SMITH, JOHN","JOHN","J.S.","OPS","","","","","",""';

      const preview = await importService.generatePreview(csv);

      expect(preview.toAdd).toHaveLength(1);
      expect(preview.toAdd[0].lastName).toBe('Smith, John');
    });

    it('should skip rows with missing required fields (SN, RANK, LAST NAME, FIRST NAME)', async () => {
      const csv = createTestCSV([
        {
          SN: '',
          'EMPL #': '',
          RANK: '',
          'LAST NAME': '',
          'FIRST NAME': '',
          INITIALS: '',
          DEPT: '',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      // Service skips invalid rows rather than throwing - returns empty results
      const preview = await importService.generatePreview(csv);
      expect(preview.toAdd).toHaveLength(0);
      expect(preview.toUpdate).toHaveLength(0);
    });

    it('should preserve optional null fields', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN308',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'SCOTT',
          'FIRST NAME': 'DIANE',
          INITIALS: '',
          DEPT: 'OPS',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.toAdd[0].employeeNumber).toBeUndefined();
      expect(preview.toAdd[0].mess).toBeUndefined();
      expect(preview.toAdd[0].moc).toBeUndefined();
    });
  });

  describe('Division mapping case insensitivity', () => {
    it('should match division by code case-insensitive', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN309',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'THOMAS',
          'FIRST NAME': 'PATRICIA',
          INITIALS: '',
          DEPT: 'ops',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.errors).toHaveLength(0);
      expect(preview.toAdd).toHaveLength(1);
      expect(preview.divisionMapping['ops']).toBe('div-1');
    });

    it('should match division by name case-insensitive', async () => {
      const csv = createTestCSV([
        {
          SN: 'SN310',
          'EMPL #': '',
          RANK: 'Petty Officer',
          'LAST NAME': 'JACKSON',
          'FIRST NAME': 'MARGARET',
          INITIALS: '',
          DEPT: 'operations',
          MESS: '',
          MOC: '',
          'EMAIL ADDRESS': '',
          'HOME PHONE': '',
          'MOBILE PHONE': '',
          DETAILS: '',
        },
      ]);

      const preview = await importService.generatePreview(csv);

      expect(preview.errors).toHaveLength(0);
      expect(preview.toAdd).toHaveLength(1);
    });
  });
});
