import * as Papa from 'papaparse';
import { memberRepository } from '../db/repositories/member-repository';
import { divisionRepository } from '../db/repositories/division-repository';
import { ValidationError } from '../utils/errors';
import { normalizeName } from '../utils/name-normalizer';
import type {
  NominalRollRow,
  ImportPreview,
  ImportResult,
  ImportError,
  Member,
  MemberType,
  CreateMemberInput,
  UpdateMemberInput,
  ImportPreviewMember,
} from '../../../shared/types';

interface CSVRow {
  SN: string;
  'EMPL #': string;
  RANK: string;
  'LAST NAME': string;
  'FIRST NAME': string;
  INITIALS: string;
  DEPT: string;
  MESS: string;
  MOC: string;
  'EMAIL ADDRESS': string;
  'HOME PHONE': string;
  'MOBILE PHONE': string;
  DETAILS: string;
}

/**
 * Service for handling Nominal Roll CSV imports
 */
export class ImportService {
  /**
   * Sanitize CSV values to prevent formula injection attacks
   * Prefixes dangerous characters with a single quote to neutralize formulas
   */
  private sanitizeCsvValue(value: string): string {
    if (!value) return value;
    const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
    if (dangerousChars.some((char) => value.startsWith(char))) {
      return `'${value}`;
    }
    return value;
  }

  /**
   * Parse CSV text and convert to NominalRollRow objects
   */
  private parseCSV(csvText: string): { rows: NominalRollRow[]; errors: ImportError[] } {
    const result = Papa.parse<CSVRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (result.errors.length > 0) {
      throw new ValidationError(
        'CSV parsing failed',
        result.errors.map((e) => `Row ${e.row}: ${e.message}`).join('; '),
        'Please ensure the CSV file is properly formatted and all columns are present.'
      );
    }

    const rows: NominalRollRow[] = [];
    const errors: ImportError[] = [];

    result.data.forEach((csvRow, index) => {
      const rowNumber = index + 2; // +2 because header is row 1, and we're 0-indexed

      // Skip completely empty rows (all required fields blank)
      const hasAnyRequiredField =
        csvRow.SN?.trim() ||
        csvRow['FIRST NAME']?.trim() ||
        csvRow['LAST NAME']?.trim() ||
        csvRow.RANK?.trim() ||
        csvRow.DEPT?.trim();

      if (!hasAnyRequiredField) {
        // Silently skip empty rows (common in CSV exports)
        return;
      }

      // Validate required fields
      if (!csvRow.SN?.trim()) {
        errors.push({
          row: rowNumber,
          field: 'SN',
          message: 'Service number is required',
        });
        return;
      }

      if (!csvRow['FIRST NAME']?.trim()) {
        errors.push({
          row: rowNumber,
          field: 'FIRST NAME',
          message: 'First name is required',
        });
        return;
      }

      if (!csvRow['LAST NAME']?.trim()) {
        errors.push({
          row: rowNumber,
          field: 'LAST NAME',
          message: 'Last name is required',
        });
        return;
      }

      if (!csvRow.RANK?.trim()) {
        errors.push({
          row: rowNumber,
          field: 'RANK',
          message: 'Rank is required',
        });
        return;
      }

      if (!csvRow.DEPT?.trim()) {
        errors.push({
          row: rowNumber,
          field: 'DEPT',
          message: 'Department is required',
        });
        return;
      }

      // Map CSV row to NominalRollRow with name normalization and CSV injection sanitization
      const nominalRow: NominalRollRow = {
        serviceNumber: this.sanitizeCsvValue(csvRow.SN.replace(/\s/g, '')), // Remove all spaces
        employeeNumber: csvRow['EMPL #']?.trim() ? this.sanitizeCsvValue(csvRow['EMPL #'].trim()) : undefined,
        rank: this.sanitizeCsvValue(csvRow.RANK.trim()),
        lastName: normalizeName(this.sanitizeCsvValue(csvRow['LAST NAME'].trim())),
        firstName: normalizeName(this.sanitizeCsvValue(csvRow['FIRST NAME'].trim())),
        initials: csvRow.INITIALS?.trim() ? this.sanitizeCsvValue(csvRow.INITIALS.trim()) : undefined,
        department: this.sanitizeCsvValue(csvRow.DEPT.trim()),
        mess: csvRow.MESS?.trim() ? this.sanitizeCsvValue(csvRow.MESS.trim()) : undefined,
        moc: csvRow.MOC?.trim() ? this.sanitizeCsvValue(csvRow.MOC.trim()) : undefined,
        email: csvRow['EMAIL ADDRESS']?.trim() ? this.sanitizeCsvValue(csvRow['EMAIL ADDRESS'].trim().toLowerCase()) : undefined,
        homePhone: csvRow['HOME PHONE']?.trim() ? this.sanitizeCsvValue(csvRow['HOME PHONE'].trim()) : undefined,
        mobilePhone: csvRow['MOBILE PHONE']?.trim() ? this.sanitizeCsvValue(csvRow['MOBILE PHONE'].trim()) : undefined,
        details: csvRow.DETAILS?.trim() ? this.sanitizeCsvValue(csvRow.DETAILS.trim()) : undefined,
      };

      rows.push(nominalRow);
    });

    return { rows, errors };
  }

  /**
   * Derive member type from details field
   */
  private deriveMemberType(details?: string): MemberType {
    if (!details) {
      return 'class_a';
    }

    const detailsUpper = details.toUpperCase();

    if (detailsUpper.includes('CLASS B')) {
      return 'class_b';
    }

    if (detailsUpper.includes('CLASS C')) {
      return 'class_c';
    }

    if (detailsUpper.includes('REG FORCE')) {
      return 'reg_force';
    }

    return 'class_a';
  }

  /**
   * Check if two members have different data that needs updating
   */
  private hasChanges(current: Member, incoming: NominalRollRow, divisionId: string): boolean {
    return (
      current.serviceNumber !== incoming.serviceNumber ||
      current.employeeNumber !== incoming.employeeNumber ||
      current.firstName !== incoming.firstName ||
      current.lastName !== incoming.lastName ||
      current.initials !== incoming.initials ||
      current.rank !== incoming.rank ||
      current.divisionId !== divisionId ||
      current.mess !== incoming.mess ||
      current.moc !== incoming.moc ||
      current.email !== incoming.email ||
      current.homePhone !== incoming.homePhone ||
      current.mobilePhone !== incoming.mobilePhone ||
      current.classDetails !== incoming.details ||
      current.memberType !== this.deriveMemberType(incoming.details)
    );
  }

  /**
   * Get list of changes between current and incoming member data
   */
  private getChanges(current: Member, incoming: NominalRollRow, divisionId: string): string[] {
    const changes: string[] = [];

    if (current.serviceNumber !== incoming.serviceNumber) {
      changes.push(`Service Number: ${current.serviceNumber} → ${incoming.serviceNumber}`);
    }
    if (current.employeeNumber !== incoming.employeeNumber) {
      changes.push(
        `Employee Number: ${current.employeeNumber ?? 'none'} → ${incoming.employeeNumber ?? 'none'}`
      );
    }
    if (current.firstName !== incoming.firstName) {
      changes.push(`First Name: ${current.firstName} → ${incoming.firstName}`);
    }
    if (current.lastName !== incoming.lastName) {
      changes.push(`Last Name: ${current.lastName} → ${incoming.lastName}`);
    }
    if (current.initials !== incoming.initials) {
      changes.push(`Initials: ${current.initials ?? 'none'} → ${incoming.initials ?? 'none'}`);
    }
    if (current.rank !== incoming.rank) {
      changes.push(`Rank: ${current.rank} → ${incoming.rank}`);
    }
    if (current.divisionId !== divisionId) {
      changes.push(`Division changed`);
    }
    if (current.mess !== incoming.mess) {
      changes.push(`Mess: ${current.mess ?? 'none'} → ${incoming.mess ?? 'none'}`);
    }
    if (current.moc !== incoming.moc) {
      changes.push(`MOC: ${current.moc ?? 'none'} → ${incoming.moc ?? 'none'}`);
    }
    if (current.email !== incoming.email) {
      changes.push(`Email: ${current.email ?? 'none'} → ${incoming.email ?? 'none'}`);
    }
    if (current.homePhone !== incoming.homePhone) {
      changes.push(
        `Home Phone: ${current.homePhone ?? 'none'} → ${incoming.homePhone ?? 'none'}`
      );
    }
    if (current.mobilePhone !== incoming.mobilePhone) {
      changes.push(
        `Mobile Phone: ${current.mobilePhone ?? 'none'} → ${incoming.mobilePhone ?? 'none'}`
      );
    }

    const newMemberType = this.deriveMemberType(incoming.details);
    if (current.memberType !== newMemberType) {
      changes.push(`Member Type: ${current.memberType} → ${newMemberType}`);
    }
    if (current.classDetails !== incoming.details) {
      changes.push(
        `Class Details: ${current.classDetails ?? 'none'} → ${incoming.details ?? 'none'}`
      );
    }

    return changes;
  }

  /**
   * Generate import preview showing what will be added, updated, and needs review
   */
  async generatePreview(csvText: string): Promise<ImportPreview> {
    // Parse CSV
    const { rows, errors } = this.parseCSV(csvText);

    if (errors.length > 0) {
      throw new ValidationError(
        'CSV validation failed',
        `Found ${errors.length} validation errors in CSV`,
        'Please fix the errors in your CSV file and try again.'
      );
    }

    // Get all divisions for mapping
    const divisions = await divisionRepository.findAll();
    const divisionMap = new Map<string, string>();
    divisions.forEach((div) => {
      divisionMap.set(div.code.toUpperCase(), div.id);
      divisionMap.set(div.name.toUpperCase(), div.id);
    });

    // Build division mapping for response
    const divisionMapping: Record<string, string> = {};

    // Collect all service numbers from CSV
    const serviceNumbers = rows.map((r) => r.serviceNumber);

    // Get all existing members with these service numbers
    const existingMembers = await memberRepository.findByServiceNumbers(serviceNumbers);
    const existingByServiceNumber = new Map<string, Member>();
    existingMembers.forEach((m) => {
      existingByServiceNumber.set(m.serviceNumber, m);
    });

    // Get all members to find those not in CSV
    const allActiveMembers = await memberRepository.findAll({ status: 'active' });
    const csvServiceNumberSet = new Set(serviceNumbers);

    const toAdd: NominalRollRow[] = [];
    const toUpdate: ImportPreviewMember[] = [];
    const toReview: Member[] = [];
    const previewErrors: ImportError[] = [];

    // Process each CSV row
    rows.forEach((row, index) => {
      const rowNumber = index + 2;

      // Check if department maps to a division
      const deptUpper = row.department.toUpperCase();
      const divisionId = divisionMap.get(deptUpper);

      if (!divisionId) {
        previewErrors.push({
          row: rowNumber,
          field: 'DEPT',
          message: `Unknown department: ${row.department}. Please add this division first.`,
        });
        return;
      }

      // Store mapping for response
      divisionMapping[row.department] = divisionId;

      const existing = existingByServiceNumber.get(row.serviceNumber);

      if (!existing) {
        // New member to add
        toAdd.push(row);
      } else {
        // Check if update needed
        if (this.hasChanges(existing, row, divisionId)) {
          toUpdate.push({
            current: existing,
            incoming: row,
            changes: this.getChanges(existing, row, divisionId),
          });
        }
      }
    });

    // Find members not in CSV (to review)
    allActiveMembers.forEach((member) => {
      if (!csvServiceNumberSet.has(member.serviceNumber)) {
        toReview.push(member);
      }
    });

    return {
      toAdd,
      toUpdate,
      toReview,
      errors: previewErrors,
      divisionMapping,
    };
  }

  /**
   * Execute the import: add new members, update existing, flag missing for review
   */
  async executeImport(csvText: string, deactivateIds?: string[]): Promise<ImportResult> {
    // Generate preview first to validate
    const preview = await this.generatePreview(csvText);

    if (preview.errors.length > 0) {
      throw new ValidationError(
        'Cannot execute import with validation errors',
        `Found ${preview.errors.length} errors in CSV`,
        'Please fix all validation errors before executing import.'
      );
    }

    // Get all divisions for mapping
    const divisions = await divisionRepository.findAll();
    const divisionMap = new Map<string, string>();
    divisions.forEach((div) => {
      divisionMap.set(div.code.toUpperCase(), div.id);
      divisionMap.set(div.name.toUpperCase(), div.id);
    });

    const result: ImportResult = {
      added: 0,
      updated: 0,
      flaggedForReview: 0,
      errors: [],
    };

    // Prepare data for bulk operations
    const membersToCreate: CreateMemberInput[] = [];
    const membersToUpdate: Array<{ id: string; data: UpdateMemberInput }> = [];

    // Process additions
    for (const row of preview.toAdd) {
      const divisionId = divisionMap.get(row.department.toUpperCase());
      if (!divisionId) {
        continue; // Should not happen after preview validation
      }

      membersToCreate.push({
        serviceNumber: row.serviceNumber,
        employeeNumber: row.employeeNumber,
        firstName: row.firstName,
        lastName: row.lastName,
        initials: row.initials,
        rank: row.rank,
        divisionId,
        mess: row.mess,
        moc: row.moc,
        memberType: this.deriveMemberType(row.details),
        classDetails: row.details,
        status: 'active',
        email: row.email,
        homePhone: row.homePhone,
        mobilePhone: row.mobilePhone,
      });
    }

    // Process updates
    for (const update of preview.toUpdate) {
      const divisionId = divisionMap.get(update.incoming.department.toUpperCase());
      if (!divisionId) {
        continue; // Should not happen after preview validation
      }

      membersToUpdate.push({
        id: update.current.id,
        data: {
          serviceNumber: update.incoming.serviceNumber,
          employeeNumber: update.incoming.employeeNumber,
          firstName: update.incoming.firstName,
          lastName: update.incoming.lastName,
          initials: update.incoming.initials,
          rank: update.incoming.rank,
          divisionId,
          mess: update.incoming.mess,
          moc: update.incoming.moc,
          memberType: this.deriveMemberType(update.incoming.details),
          classDetails: update.incoming.details,
          email: update.incoming.email,
          homePhone: update.incoming.homePhone,
          mobilePhone: update.incoming.mobilePhone,
        },
      });
    }

    // Execute bulk operations
    if (membersToCreate.length > 0) {
      result.added = await memberRepository.bulkCreate(membersToCreate);
    }

    if (membersToUpdate.length > 0) {
      result.updated = await memberRepository.bulkUpdate(membersToUpdate);
    }

    // Flag members for review if requested
    if (deactivateIds && deactivateIds.length > 0) {
      await memberRepository.flagForReview(deactivateIds);
      result.flaggedForReview = deactivateIds.length;
    }

    return result;
  }
}

export const importService = new ImportService();
