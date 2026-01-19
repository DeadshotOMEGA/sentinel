import * as Papa from 'papaparse';
import { memberRepository } from '../db/repositories/member-repository';
import { divisionRepository } from '../db/repositories/division-repository';
import { listItemRepository } from '../db/repositories/list-item-repository';
import { ValidationError } from '../utils/errors';
import { normalizeName } from '../utils/name-normalizer';
import { sanitizeCsvValue } from '../utils/csv-sanitizer';
import { prisma } from '../db/prisma';
import { LOCK_KEYS } from '../utils/advisory-lock';
import type { ListType } from '../../../shared/types';
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
  ImportColumnMapping,
  CsvHeadersResult,
  ImportTemplateField,
  DivisionDetectionResult,
  DetectedDivision,
  ImportDivisionMapping,
} from '../../../shared/types';
import { IMPORT_FIELD_META } from '../../../shared/types';

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
 * Uses centralized CSV sanitization to prevent injection attacks (HIGH-7)
 */
export class ImportService {

  /**
   * Parse date string from CSV and return ISO string or undefined
   * Accepts common formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, DD-MMM-YY
   */
  private parseDate(dateStr?: string): string | undefined {
    if (!dateStr?.trim()) {
      return undefined;
    }

    const cleaned = dateStr.trim();

    // Try parsing as ISO date (YYYY-MM-DD)
    const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const date = new Date(cleaned);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    // Try MM/DD/YYYY
    const usMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      const [, month, day, year] = usMatch;
      const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    // Try DD/MM/YYYY
    const euMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (euMatch) {
      const [, day, month, year] = euMatch;
      const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    // Try DD-MMM-YY (e.g., 15-Jun-25)
    const monthNames: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const abbrevMatch = cleaned.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
    if (abbrevMatch) {
      const [, day, monthAbbrev, yearShort] = abbrevMatch;
      const month = monthNames[monthAbbrev.toLowerCase()];
      if (month) {
        // Assume 20xx for two-digit years
        const year = `20${yearShort}`;
        const date = new Date(`${year}-${month}-${day.padStart(2, '0')}`);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }

    // Invalid or unrecognized format
    return undefined;
  }

  /**
   * Parse CSV headers and return sample rows with suggested column mapping
   */
  parseHeaders(csvText: string): CsvHeadersResult {
    const result = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      preview: 4, // Parse header + first 3 data rows
    });

    if (result.errors.length > 0) {
      throw new ValidationError(
        'CSV parsing failed',
        result.errors.map((e) => `Row ${e.row}: ${e.message}`).join('; '),
        'Please ensure the CSV file is properly formatted.'
      );
    }

    const headers = result.meta.fields ?? [];
    const sampleRows = result.data.slice(0, 3);

    // Auto-match headers to template fields using aliases
    const suggestedMapping: Partial<ImportColumnMapping> = {};
    const matchedHeaders = new Set<string>();

    // Normalize header names for matching
    const normalizedHeaders = headers.map(h => h.trim().toUpperCase());

    // Try to match each template field with CSV headers
    for (const fieldMeta of IMPORT_FIELD_META) {
      const field = fieldMeta.field;

      // Check each alias to see if it matches a header
      for (const alias of fieldMeta.aliases) {
        const normalizedAlias = alias.toUpperCase();
        const matchIndex = normalizedHeaders.indexOf(normalizedAlias);

        if (matchIndex !== -1 && !matchedHeaders.has(headers[matchIndex])) {
          suggestedMapping[field] = headers[matchIndex];
          matchedHeaders.add(headers[matchIndex]);
          break;
        }
      }
    }

    // Find unmapped headers
    const unmappedHeaders = headers.filter(h => !matchedHeaders.has(h));

    return {
      headers,
      sampleRows,
      suggestedMapping,
      unmappedHeaders,
    };
  }

  /**
   * Detect divisions from CSV and match against existing divisions
   */
  async detectDivisions(csvText: string, columnMapping: ImportColumnMapping): Promise<DivisionDetectionResult> {
    const result = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (result.errors.length > 0) {
      throw new ValidationError(
        'CSV parsing failed',
        result.errors.map((e) => `Row ${e.row}: ${e.message}`).join('; '),
        'Please ensure the CSV file is properly formatted.'
      );
    }

    // Get the department column name from mapping
    const departmentColumn = columnMapping.department;
    if (!departmentColumn) {
      throw new ValidationError(
        'Department column not mapped',
        'The department/division column must be mapped before detecting divisions.',
        'Please map the department column in the column mapping step.'
      );
    }

    // Count occurrences of each department value
    const departmentCounts = new Map<string, number>();
    for (const row of result.data) {
      const dept = row[departmentColumn]?.trim();
      if (dept) {
        departmentCounts.set(dept, (departmentCounts.get(dept) || 0) + 1);
      }
    }

    // Get all existing divisions
    const existingDivisions = await divisionRepository.findAll();

    // Create lookup maps for matching
    const divisionByCode = new Map<string, typeof existingDivisions[0]>();
    const divisionByName = new Map<string, typeof existingDivisions[0]>();
    for (const div of existingDivisions) {
      divisionByCode.set(div.code.toUpperCase(), div);
      divisionByName.set(div.name.toUpperCase(), div);
    }

    // Match each detected department to existing divisions
    const detected: DetectedDivision[] = [];
    for (const [csvValue, count] of departmentCounts) {
      const upperValue = csvValue.toUpperCase();
      const matchedByCode = divisionByCode.get(upperValue);
      const matchedByName = divisionByName.get(upperValue);
      const matched = matchedByCode || matchedByName;

      detected.push({
        csvValue,
        existingDivisionId: matched?.id,
        existingDivisionName: matched?.name,
        memberCount: count,
      });
    }

    // Sort by member count descending, then by name
    detected.sort((a, b) => {
      if (b.memberCount !== a.memberCount) {
        return b.memberCount - a.memberCount;
      }
      return a.csvValue.localeCompare(b.csvValue);
    });

    return {
      detected,
      existingDivisions,
    };
  }

  /**
   * Parse CSV text and convert to NominalRollRow objects
   */
  private parseCSV(csvText: string, columnMapping?: ImportColumnMapping): { rows: NominalRollRow[]; errors: ImportError[] } {
    const result = Papa.parse<Record<string, string>>(csvText, {
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

    // Build mapping from template field to CSV column name
    const fieldToColumn: Record<ImportTemplateField, string | null> = columnMapping ?? this.getDefaultColumnMapping();

    const rows: NominalRollRow[] = [];
    const errors: ImportError[] = [];

    result.data.forEach((csvRow, index) => {
      const rowNumber = index + 2; // +2 because header is row 1, and we're 0-indexed

      // Helper to get value from CSV row using field mapping
      const getValue = (field: ImportTemplateField): string | undefined => {
        const columnName = fieldToColumn[field];
        if (!columnName) return undefined;
        return csvRow[columnName];
      };

      // Skip completely empty rows (all required fields blank)
      const hasAnyRequiredField =
        getValue('serviceNumber')?.trim() ||
        getValue('firstName')?.trim() ||
        getValue('lastName')?.trim() ||
        getValue('rank')?.trim() ||
        getValue('department')?.trim();

      if (!hasAnyRequiredField) {
        // Silently skip empty rows (common in CSV exports)
        return;
      }

      // Validate required fields
      const serviceNumber = getValue('serviceNumber')?.trim();
      if (!serviceNumber) {
        errors.push({
          row: rowNumber,
          field: 'serviceNumber',
          message: 'Service number is required',
        });
        return;
      }

      const firstName = getValue('firstName')?.trim();
      if (!firstName) {
        errors.push({
          row: rowNumber,
          field: 'firstName',
          message: 'First name is required',
        });
        return;
      }

      const lastName = getValue('lastName')?.trim();
      if (!lastName) {
        errors.push({
          row: rowNumber,
          field: 'lastName',
          message: 'Last name is required',
        });
        return;
      }

      const rank = getValue('rank')?.trim();
      if (!rank) {
        errors.push({
          row: rowNumber,
          field: 'rank',
          message: 'Rank is required',
        });
        return;
      }

      const department = getValue('department')?.trim();
      if (!department) {
        errors.push({
          row: rowNumber,
          field: 'department',
          message: 'Department is required',
        });
        return;
      }

      // Map CSV row to NominalRollRow with name normalization and CSV injection sanitization
      const nominalRow: NominalRollRow = {
        serviceNumber: sanitizeCsvValue(serviceNumber.replace(/\s/g, '')), // Remove all spaces
        employeeNumber: getValue('employeeNumber')?.trim() ? sanitizeCsvValue(getValue('employeeNumber')!.trim()) : undefined,
        rank: sanitizeCsvValue(rank),
        lastName: normalizeName(sanitizeCsvValue(lastName)),
        firstName: normalizeName(sanitizeCsvValue(firstName)),
        initials: getValue('initials')?.trim() ? sanitizeCsvValue(getValue('initials')!.trim()) : undefined,
        department: sanitizeCsvValue(department),
        mess: getValue('mess')?.trim() ? sanitizeCsvValue(getValue('mess')!.trim()) : undefined,
        moc: getValue('moc')?.trim() ? sanitizeCsvValue(getValue('moc')!.trim()) : undefined,
        email: getValue('email')?.trim() ? sanitizeCsvValue(getValue('email')!.trim().toLowerCase()) : undefined,
        homePhone: getValue('homePhone')?.trim() ? sanitizeCsvValue(getValue('homePhone')!.trim()) : undefined,
        mobilePhone: getValue('mobilePhone')?.trim() ? sanitizeCsvValue(getValue('mobilePhone')!.trim()) : undefined,
        details: getValue('details')?.trim() ? sanitizeCsvValue(getValue('details')!.trim()) : undefined,
        notes: getValue('notes')?.trim() ? sanitizeCsvValue(getValue('notes')!.trim()) : undefined,
        contractStart: this.parseDate(getValue('contractStart')),
        contractEnd: this.parseDate(getValue('contractEnd')),
      };

      rows.push(nominalRow);
    });

    return { rows, errors };
  }

  /**
   * Get default column mapping for backward compatibility
   */
  private getDefaultColumnMapping(): Record<ImportTemplateField, string | null> {
    return {
      serviceNumber: 'SN',
      employeeNumber: 'EMPL #',
      rank: 'RANK',
      lastName: 'LAST NAME',
      firstName: 'FIRST NAME',
      initials: 'INITIALS',
      department: 'DEPT',
      mess: 'MESS',
      moc: 'MOC',
      email: 'EMAIL ADDRESS',
      homePhone: 'HOME PHONE',
      mobilePhone: 'MOBILE PHONE',
      details: 'DETAILS',
      notes: 'NOTES',
      contractStart: 'CONTRACT START',
      contractEnd: 'CONTRACT END',
    };
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
   * Ensure a list item exists for a given type and name.
   * Creates it with is_system=false if it doesn't exist.
   * Silently handles duplicates and errors to prevent import failures.
   */
  private async ensureListItemExists(listType: ListType, name: string): Promise<void> {
    if (!name?.trim()) {
      return;
    }

    // Generate code from name: lowercase, replace spaces/hyphens with underscores
    const code = name.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_').replace(/'/g, '');

    try {
      const existing = await listItemRepository.findByTypeAndCode(listType, code);
      if (!existing) {
        await listItemRepository.create(listType, { code, name, isSystem: false });
      }
    } catch {
      // Silently ignore errors - list item creation should not fail imports
      // This handles race conditions where item might be created between check and insert
    }
  }

  /**
   * Check if two members have different data that needs updating
   */
  private hasChanges(current: Member, incoming: NominalRollRow, divisionId: string): boolean {
    // Helper to compare dates (Member has Date objects, incoming has ISO strings)
    const dateChanged = (currentDate?: Date, incomingDateStr?: string): boolean => {
      const currentIso = currentDate?.toISOString().split('T')[0];
      return currentIso !== incomingDateStr;
    };

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
      current.memberType !== this.deriveMemberType(incoming.details) ||
      current.notes !== incoming.notes ||
      dateChanged(current.contractStart, incoming.contractStart) ||
      dateChanged(current.contractEnd, incoming.contractEnd)
    );
  }

  /**
   * Get list of changes between current and incoming member data
   */
  private getChanges(current: Member, incoming: NominalRollRow, divisionId: string): string[] {
    const changes: string[] = [];

    // Helper to format date for display
    const formatDate = (date?: Date | string): string => {
      if (!date) return 'none';
      if (typeof date === 'string') return date;
      return date.toISOString().split('T')[0];
    };

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
    if (current.notes !== incoming.notes) {
      changes.push(`Notes: ${current.notes ?? 'none'} → ${incoming.notes ?? 'none'}`);
    }

    // Check date changes
    const currentContractStart = formatDate(current.contractStart);
    const incomingContractStart = formatDate(incoming.contractStart);
    if (currentContractStart !== incomingContractStart) {
      changes.push(`Contract Start: ${currentContractStart} → ${incomingContractStart}`);
    }

    const currentContractEnd = formatDate(current.contractEnd);
    const incomingContractEnd = formatDate(incoming.contractEnd);
    if (currentContractEnd !== incomingContractEnd) {
      changes.push(`Contract End: ${currentContractEnd} → ${incomingContractEnd}`);
    }

    return changes;
  }

  /**
   * Generate import preview showing what will be added, updated, and needs review
   */
  async generatePreview(
    csvText: string,
    columnMapping?: ImportColumnMapping,
    userDivisionMapping?: ImportDivisionMapping
  ): Promise<ImportPreview> {
    // Parse CSV
    const { rows, errors } = this.parseCSV(csvText, columnMapping);

    if (errors.length > 0) {
      throw new ValidationError(
        'CSV validation failed',
        `Found ${errors.length} validation errors in CSV`,
        'Please fix the errors in your CSV file and try again.'
      );
    }

    // Get all divisions for auto-mapping
    const divisions = await divisionRepository.findAll();
    const divisionByCode = new Map<string, string>();
    const divisionByName = new Map<string, string>();
    divisions.forEach((div) => {
      divisionByCode.set(div.code.toUpperCase(), div.id);
      divisionByName.set(div.name.toUpperCase(), div.id);
    });

    // Build division mapping for response - prefer user mapping, then auto-match
    const divisionMapping: Record<string, string> = {};

    // Helper to resolve division ID for a department value
    const resolveDivisionId = (dept: string): string | null => {
      // First check user-provided mapping
      if (userDivisionMapping?.[dept]) {
        return userDivisionMapping[dept];
      }
      // Then try auto-matching by code or name
      const deptUpper = dept.toUpperCase();
      return divisionByCode.get(deptUpper) || divisionByName.get(deptUpper) || null;
    };

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
      const divisionId = resolveDivisionId(row.department);

      if (!divisionId) {
        previewErrors.push({
          row: rowNumber,
          field: 'DEPT',
          message: `Unknown department: ${row.department}. Please map this division first.`,
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
   * Wrapped in advisory lock + transaction for atomicity and concurrency protection
   */
  async executeImport(
    csvText: string,
    deactivateIds?: string[],
    columnMapping?: ImportColumnMapping,
    userDivisionMapping?: ImportDivisionMapping
  ): Promise<ImportResult> {
    // Generate preview first to validate (read-only, outside transaction)
    const preview = await this.generatePreview(csvText, columnMapping, userDivisionMapping);

    if (preview.errors.length > 0) {
      throw new ValidationError(
        'Cannot execute import with validation errors',
        `Found ${preview.errors.length} errors in CSV`,
        'Please fix all validation errors before executing import.'
      );
    }

    // Reuse division mapping from preview to avoid redundant query
    // Note: divisionMapping now uses original dept values as keys, not uppercase
    const divisionMap = new Map<string, string>(
      Object.entries(preview.divisionMapping)
    );

    // Auto-populate list_items for rank, mess, and moc values
    // This builds suggestion lists from real import data
    // Done before transaction to avoid conflicts with advisory lock
    const allRows = [...preview.toAdd, ...preview.toUpdate.map(u => u.incoming)];
    const uniqueRanks = new Set<string>();
    const uniqueMesses = new Set<string>();
    const uniqueMocs = new Set<string>();

    for (const row of allRows) {
      if (row.rank) uniqueRanks.add(row.rank);
      if (row.mess) uniqueMesses.add(row.mess);
      if (row.moc) uniqueMocs.add(row.moc);
    }

    // Create list items in parallel - errors are silently ignored to prevent import failures
    const listItemPromises: Promise<void>[] = [];
    for (const rank of uniqueRanks) {
      listItemPromises.push(this.ensureListItemExists('rank', rank));
    }
    for (const mess of uniqueMesses) {
      listItemPromises.push(this.ensureListItemExists('mess', mess));
    }
    for (const moc of uniqueMocs) {
      listItemPromises.push(this.ensureListItemExists('moc', moc));
    }
    await Promise.all(listItemPromises);

    // Use advisory lock + transaction to prevent concurrent imports
    // withAdvisoryLock already wraps in a transaction, so we use that transaction
    return prisma.$transaction(async (tx) => {
      // Acquire advisory lock within transaction
      const lockId = this.hashLockKey(LOCK_KEYS.MEMBER_IMPORT);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId})`;

      let added = 0;
      let updated = 0;
      let flaggedForReview = 0;

      // Process additions - create members one by one
      for (const row of preview.toAdd) {
        // Look up by original department value (not uppercase)
        const divisionId = divisionMap.get(row.department);
        if (!divisionId) {
          continue; // Should not happen after preview validation
        }

        await tx.member.create({
          data: {
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
            notes: row.notes,
            contract_start: row.contractStart ? new Date(row.contractStart) : undefined,
            contract_end: row.contractEnd ? new Date(row.contractEnd) : undefined,
            status: 'active',
            email: row.email,
            homePhone: row.homePhone,
            mobilePhone: row.mobilePhone,
          },
        });
        added++;
      }

      // Process updates - update members one by one
      for (const update of preview.toUpdate) {
        // Look up by original department value (not uppercase)
        const divisionId = divisionMap.get(update.incoming.department);
        if (!divisionId) {
          continue; // Should not happen after preview validation
        }

        await tx.member.update({
          where: { id: update.current.id },
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
            notes: update.incoming.notes,
            contract_start: update.incoming.contractStart ? new Date(update.incoming.contractStart) : null,
            contract_end: update.incoming.contractEnd ? new Date(update.incoming.contractEnd) : null,
            email: update.incoming.email,
            homePhone: update.incoming.homePhone,
            mobilePhone: update.incoming.mobilePhone,
          },
        });
        updated++;
      }

      // Flag members for review if requested
      if (deactivateIds && deactivateIds.length > 0) {
        await tx.member.updateMany({
          where: { id: { in: deactivateIds } },
          data: { status: 'pending_review' },
        });
        flaggedForReview = deactivateIds.length;
      }

      return {
        added,
        updated,
        flaggedForReview,
        errors: [],
      };
    });
  }

  /**
   * Hash string key to numeric ID for advisory locks
   */
  private hashLockKey(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}

export const importService = new ImportService();
