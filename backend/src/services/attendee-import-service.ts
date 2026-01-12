import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { eventRepository } from '../db/repositories/event-repository';
import { prisma } from '../db/prisma';
import { ValidationError, NotFoundError } from '../utils/errors';
import type {
  AttendeeImportTemplateField,
  AttendeeImportColumnMapping,
  AttendeeImportRow,
  AttendeeImportHeadersResult,
  ExcelSheetInfo,
  DetectedAttendeeRole,
  AttendeeRoleDetectionResult,
  AttendeeRoleMapping,
  AttendeeImportDuplicate,
  AttendeeImportError,
  AttendeeImportPreview,
  AttendeeImportResult,
  DuplicateResolution,
  EventAttendee,
} from '../../../shared/types';
import {
  ATTENDEE_IMPORT_FIELD_META,
  REQUIRED_ATTENDEE_IMPORT_FIELDS,
} from '../../../shared/types/event';

const DEFAULT_EVENT_ROLES = ['Participant', 'Instructor', 'Staff', 'Volunteer'];

/**
 * Service for handling Event Attendee imports from CSV and Excel files
 */
export class AttendeeImportService {
  // ============================================================================
  // Excel Parsing
  // ============================================================================

  /**
   * Parse Excel file and return available sheets with metadata
   */
  parseExcelSheets(buffer: Buffer): ExcelSheetInfo[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    return workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      const rowCount = Math.max(0, range.e.r); // Exclude header row from count

      // Get first row as sample headers
      const sampleHeaders: string[] = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
        if (cell && cell.v !== undefined) {
          sampleHeaders.push(String(cell.v).trim());
        }
      }

      return {
        name,
        rowCount,
        sampleHeaders,
      };
    });
  }

  /**
   * Parse a specific Excel sheet and convert to CSV text
   */
  parseExcelToCSV(buffer: Buffer, sheetName: string): string {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    if (!workbook.SheetNames.includes(sheetName)) {
      throw new ValidationError(
        'Sheet not found',
        `Sheet "${sheetName}" does not exist in the workbook`,
        'Please select a valid sheet from the list.'
      );
    }

    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
  }

  // ============================================================================
  // CSV Header Parsing
  // ============================================================================

  /**
   * Parse CSV headers and suggest column mapping based on field aliases
   */
  parseHeaders(csvText: string): AttendeeImportHeadersResult {
    const result = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      preview: 4, // Header + 3 sample rows
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
    const suggestedMapping = this.autoMapColumns(headers);

    // Find unmapped headers
    const mappedHeaders = new Set(Object.values(suggestedMapping).filter(Boolean));
    const unmappedHeaders = headers.filter((h) => !mappedHeaders.has(h));

    return {
      headers,
      sampleRows,
      suggestedMapping,
      unmappedHeaders,
    };
  }

  /**
   * Auto-map CSV headers to template fields using aliases
   */
  private autoMapColumns(headers: string[]): Partial<AttendeeImportColumnMapping> {
    const mapping: Partial<AttendeeImportColumnMapping> = {};
    const matchedHeaders = new Set<string>();
    const normalizedHeaders = headers.map((h) => h.trim().toUpperCase());

    for (const fieldMeta of ATTENDEE_IMPORT_FIELD_META) {
      const field = fieldMeta.field;

      for (const alias of fieldMeta.aliases) {
        const normalizedAlias = alias.toUpperCase();
        const matchIndex = normalizedHeaders.indexOf(normalizedAlias);

        if (matchIndex !== -1 && !matchedHeaders.has(headers[matchIndex])) {
          mapping[field] = headers[matchIndex];
          matchedHeaders.add(headers[matchIndex]);
          break;
        }
      }
    }

    return mapping;
  }

  // ============================================================================
  // Role Detection
  // ============================================================================

  /**
   * Detect unique roles in CSV and compare to event's available roles
   */
  async detectRoles(
    csvText: string,
    columnMapping: AttendeeImportColumnMapping,
    eventId: string
  ): Promise<AttendeeRoleDetectionResult> {
    // Parse CSV
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

    // Get role column
    const roleColumn = columnMapping.role;
    if (!roleColumn) {
      throw new ValidationError(
        'Role column not mapped',
        'The role column must be mapped before detecting roles.',
        'Please map the role column in the column mapping step.'
      );
    }

    // Count occurrences of each role value
    const roleCounts = new Map<string, number>();
    for (const row of result.data) {
      const roleValue = row[roleColumn]?.trim();
      if (roleValue) {
        roleCounts.set(roleValue, (roleCounts.get(roleValue) || 0) + 1);
      }
    }

    // Get event's available roles
    const eventRoles = await this.getEventRoles(eventId);

    // Build detected roles with auto-matching
    const detectedRoles: DetectedAttendeeRole[] = [];
    for (const [csvValue, count] of roleCounts) {
      // Try to find a matching event role (case-insensitive)
      const normalizedCsvValue = csvValue.toLowerCase().trim();
      const matchedRole = eventRoles.find(
        (r) => r.toLowerCase().trim() === normalizedCsvValue
      );

      detectedRoles.push({
        csvValue,
        matchedRole,
        attendeeCount: count,
      });
    }

    // Sort by count descending
    detectedRoles.sort((a, b) => b.attendeeCount - a.attendeeCount);

    return {
      detectedRoles,
      eventRoles,
    };
  }

  /**
   * Get event's available roles (custom or default)
   */
  private async getEventRoles(eventId: string): Promise<string[]> {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new NotFoundError(
        'Event not found',
        `Event ${eventId} does not exist`,
        'Please check the event ID and try again.'
      );
    }

    // Use custom roles if defined, otherwise fetch defaults
    if (event.customRoles && event.customRoles.length > 0) {
      return event.customRoles;
    }

    // Fetch default roles from settings
    const setting = await prisma.report_settings.findUnique({
      where: { key: 'event_roles' },
    });

    if (setting && Array.isArray(setting.value)) {
      return setting.value as string[];
    }

    return DEFAULT_EVENT_ROLES;
  }

  // ============================================================================
  // Preview Generation
  // ============================================================================

  /**
   * Generate import preview with duplicate detection
   */
  async generatePreview(
    csvText: string,
    columnMapping: AttendeeImportColumnMapping,
    roleMapping: AttendeeRoleMapping,
    eventId: string
  ): Promise<AttendeeImportPreview> {
    // Validate event exists
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new NotFoundError(
        'Event not found',
        `Event ${eventId} does not exist`,
        'Please check the event ID and try again.'
      );
    }

    // Parse CSV
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

    // Get existing attendees for duplicate detection
    const existingAttendees = await eventRepository.findByEventId(eventId);

    // Process rows
    const toAdd: AttendeeImportRow[] = [];
    const duplicates: AttendeeImportDuplicate[] = [];
    const errors: AttendeeImportError[] = [];

    for (let i = 0; i < result.data.length; i++) {
      const row = result.data[i];
      const rowIndex = i + 2; // +2 for 1-indexed + header row

      // Validate and extract row data
      const validationErrors = this.validateRow(row, columnMapping, rowIndex);
      if (validationErrors.length > 0) {
        errors.push(...validationErrors);
        continue;
      }

      // Extract fields
      const importRow = this.extractRowData(row, columnMapping, roleMapping);

      // Check for duplicates by name
      const existingMatch = this.findExistingAttendee(importRow.name, existingAttendees);

      if (existingMatch) {
        duplicates.push({
          rowIndex,
          incoming: importRow,
          existing: existingMatch,
          resolution: 'skip', // Default suggestion
        });
      } else {
        toAdd.push(importRow);
      }
    }

    return {
      toAdd,
      duplicates,
      errors,
    };
  }

  /**
   * Validate a row has required fields
   */
  private validateRow(
    row: Record<string, string>,
    mapping: AttendeeImportColumnMapping,
    rowIndex: number
  ): AttendeeImportError[] {
    const errors: AttendeeImportError[] = [];

    for (const field of REQUIRED_ATTENDEE_IMPORT_FIELDS) {
      const column = mapping[field];
      if (!column) {
        errors.push({
          row: rowIndex,
          field,
          message: `Required field "${field}" is not mapped`,
          howToFix: 'Please map all required columns in the column mapping step.',
        });
        continue;
      }

      const value = row[column]?.trim();
      if (!value) {
        errors.push({
          row: rowIndex,
          field,
          message: `Required field "${field}" is empty`,
          howToFix: `Please provide a value for ${field} in row ${rowIndex}.`,
        });
      }
    }

    return errors;
  }

  /**
   * Extract row data into AttendeeImportRow
   */
  private extractRowData(
    row: Record<string, string>,
    mapping: AttendeeImportColumnMapping,
    roleMapping: AttendeeRoleMapping
  ): AttendeeImportRow {
    const getValue = (field: AttendeeImportTemplateField): string | undefined => {
      const column = mapping[field];
      if (!column) return undefined;
      const value = row[column]?.trim();
      return value || undefined;
    };

    // Get the CSV role value and map it
    const csvRole = getValue('role') || '';
    const mappedRole = roleMapping[csvRole] || csvRole;

    return {
      name: getValue('name') || '',
      rank: getValue('rank'),
      organization: getValue('organization') || '',
      role: mappedRole,
      accessStart: this.parseDate(getValue('accessStart')),
      accessEnd: this.parseDate(getValue('accessEnd')),
    };
  }

  /**
   * Find existing attendee by normalized name
   */
  private findExistingAttendee(
    name: string,
    existingAttendees: EventAttendee[]
  ): EventAttendee | undefined {
    const normalizedName = this.normalizeForComparison(name);
    return existingAttendees.find(
      (a) => this.normalizeForComparison(a.name) === normalizedName
    );
  }

  /**
   * Normalize string for comparison (lowercase, trimmed, collapsed whitespace)
   */
  private normalizeForComparison(str: string): string {
    return str.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Parse date string from various formats
   */
  private parseDate(dateStr?: string): string | undefined {
    if (!dateStr?.trim()) {
      return undefined;
    }

    const cleaned = dateStr.trim();

    // Try ISO format (YYYY-MM-DD)
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

    // Try DD/MM/YYYY (check if day > 12 to distinguish from US format)
    const euMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (euMatch) {
      const [, first, second, year] = euMatch;
      const firstNum = parseInt(first, 10);
      // If first number > 12, it must be day (EU format)
      if (firstNum > 12) {
        const date = new Date(`${year}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }

    // Try DD-MMM-YY (e.g., 15-Jun-25)
    const monthNames: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const abbrevMatch = cleaned.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
    if (abbrevMatch) {
      const [, day, monthAbbrev, yearPart] = abbrevMatch;
      const month = monthNames[monthAbbrev.toLowerCase()];
      if (month) {
        const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
        const date = new Date(`${year}-${month}-${day.padStart(2, '0')}`);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }

    return undefined;
  }

  // ============================================================================
  // Import Execution
  // ============================================================================

  /**
   * Execute the import with user-specified duplicate resolutions
   */
  async executeImport(
    csvText: string,
    columnMapping: AttendeeImportColumnMapping,
    roleMapping: AttendeeRoleMapping,
    duplicateResolutions: Record<number, DuplicateResolution>,
    editedValues: Record<number, AttendeeImportRow>,
    eventId: string
  ): Promise<AttendeeImportResult> {
    // Validate event exists
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new NotFoundError(
        'Event not found',
        `Event ${eventId} does not exist`,
        'Please check the event ID and try again.'
      );
    }

    // Parse CSV
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

    // Get existing attendees
    const existingAttendees = await eventRepository.findByEventId(eventId);

    // Check if any new roles need to be added to event
    const newRoles = await this.collectNewRoles(roleMapping, eventId);
    if (newRoles.length > 0) {
      // Add new roles to event's customRoles
      const currentRoles = event.customRoles || (await this.getEventRoles(eventId));
      const updatedRoles = [...new Set([...currentRoles, ...newRoles])];
      await eventRepository.update(eventId, { customRoles: updatedRoles });
    }

    // Process rows
    let added = 0;
    let updated = 0;
    let skipped = 0;
    const errors: AttendeeImportError[] = [];

    for (let i = 0; i < result.data.length; i++) {
      const row = result.data[i];
      const rowIndex = i + 2; // +2 for 1-indexed + header row

      // Validate row
      const validationErrors = this.validateRow(row, columnMapping, rowIndex);
      if (validationErrors.length > 0) {
        errors.push(...validationErrors);
        continue;
      }

      // Extract row data
      let importRow = this.extractRowData(row, columnMapping, roleMapping);

      // Check for duplicate and get resolution
      const existingMatch = this.findExistingAttendee(importRow.name, existingAttendees);

      if (existingMatch) {
        const resolution = duplicateResolutions[rowIndex] || 'skip';

        switch (resolution) {
          case 'skip':
            skipped++;
            break;

          case 'add':
            // Add as new attendee even though name matches
            await this.createAttendee(importRow, eventId);
            added++;
            break;

          case 'update':
            // Update existing attendee
            await this.updateAttendee(existingMatch.id, importRow);
            updated++;
            break;

          case 'edit':
            // Use edited values if provided
            if (editedValues[rowIndex]) {
              importRow = editedValues[rowIndex];
            }
            await this.createAttendee(importRow, eventId);
            added++;
            break;
        }
      } else {
        // New attendee - add
        await this.createAttendee(importRow, eventId);
        added++;
      }
    }

    return {
      added,
      updated,
      skipped,
      errors,
    };
  }

  /**
   * Collect new roles that need to be created
   */
  private async collectNewRoles(
    roleMapping: AttendeeRoleMapping,
    eventId: string
  ): Promise<string[]> {
    const eventRoles = await this.getEventRoles(eventId);
    const eventRolesLower = new Set(eventRoles.map((r) => r.toLowerCase()));

    const newRoles: string[] = [];
    const mappedRoles: string[] = Object.values(roleMapping);
    for (const mappedRole of mappedRoles) {
      if (!eventRolesLower.has(mappedRole.toLowerCase())) {
        newRoles.push(mappedRole);
      }
    }

    return [...new Set(newRoles)]; // Deduplicate
  }

  /**
   * Create a new attendee
   */
  private async createAttendee(row: AttendeeImportRow, eventId: string): Promise<void> {
    await eventRepository.addAttendee({
      eventId,
      name: row.name,
      rank: row.rank,
      organization: row.organization,
      role: row.role,
      accessStart: row.accessStart ? new Date(row.accessStart) : undefined,
      accessEnd: row.accessEnd ? new Date(row.accessEnd) : undefined,
      status: 'pending',
    });
  }

  /**
   * Update an existing attendee
   */
  private async updateAttendee(attendeeId: string, row: AttendeeImportRow): Promise<void> {
    await eventRepository.updateAttendee(attendeeId, {
      name: row.name,
      rank: row.rank,
      organization: row.organization,
      role: row.role,
      accessStart: row.accessStart ? new Date(row.accessStart) : undefined,
      accessEnd: row.accessEnd ? new Date(row.accessEnd) : undefined,
    });
  }
}

export const attendeeImportService = new AttendeeImportService();
