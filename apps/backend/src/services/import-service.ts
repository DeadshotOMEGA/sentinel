import Papa from 'papaparse'
import type {
  NominalRollRow,
  ImportError,
  PreviewImportResponse,
  ExecuteImportResponse,
  DivisionToCreate,
} from '@sentinel/contracts'
import type { Member, MemberType, CreateMemberInput, UpdateMemberInput } from '@sentinel/types'
import { importLogger } from '../lib/logger.js'
import { MemberRepository } from '../repositories/member-repository.js'
import { DivisionRepository } from '../repositories/division-repository.js'
import { MemberTypeRepository } from '../repositories/member-type-repository.js'
import { AutoQualificationService } from './auto-qualification-service.js'
import { getPrismaClient } from '../lib/database.js'
import { toNameCase } from '../utils/name-case.js'

/**
 * Mapping of department codes to full names for auto-creation
 */
const DEPARTMENT_CODE_NAMES: Record<string, string> = {
  'ADMIN': 'Administration',
  'BAND': 'Band',
  'BMQ': 'Basic Military Qualification',
  'CMD': 'Command',
  'DECK': 'Deck',
  'LOG': 'Logistics',
  'OPS': 'Operations',
  'PAO': 'Public Affairs',
  'TRG': 'Training',
}

/**
 * Mapping of member type codes to display names for auto-creation
 */
const MEMBER_TYPE_NAMES: Record<string, string> = {
  'class_a': 'Class A Reserve',
  'class_b': 'Class B Reserve',
  'class_c': 'Class C Reserve',
  'reg_force': 'Regular Force',
}

interface ParsedCSVRow {
  SN?: string
  'EMPL #'?: string
  RANK?: string
  'LAST NAME'?: string
  'FIRST NAME'?: string
  INITIALS?: string
  DEPT?: string
  MESS?: string
  MOC?: string
  'EMAIL ADDRESS'?: string
  'HOME PHONE'?: string
  'MOBILE PHONE'?: string
  DETAILS?: string
}

export class ImportService {
  private memberRepository: MemberRepository
  private divisionRepository: DivisionRepository
  private memberTypeRepository: MemberTypeRepository

  constructor() {
    const prisma = getPrismaClient()
    this.memberRepository = new MemberRepository(prisma)
    this.divisionRepository = new DivisionRepository(prisma)
    this.memberTypeRepository = new MemberTypeRepository(prisma)
  }

  /**
   * Parse CSV text and convert to NominalRollRow objects
   * @param csvText - The raw CSV text
   * @param excludeRows - Optional array of row numbers to skip (for continuing import despite errors)
   */
  private parseCSV(csvText: string, excludeRows?: number[]): { rows: NominalRollRow[]; errors: ImportError[] } {
    const errors: ImportError[] = []
    const rows: NominalRollRow[] = []
    const excludeSet = new Set(excludeRows || [])

    // Parse CSV with PapaParse
    const parseResult = Papa.parse<ParsedCSVRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    })

    // Check for parsing errors
    if (parseResult.errors.length > 0) {
      for (const error of parseResult.errors) {
        errors.push({
          row: error.row ?? 0,
          field: 'csv',
          message: error.message,
          excludable: false, // CSV parsing errors are not excludable
        })
      }
      return { rows: [], errors }
    }

    // Process each row
    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i]
      const rowNumber = i + 2 // +2 because: array is 0-indexed, and there's a header row

      // Skip undefined rows
      if (!row) {
        continue
      }

      // Skip excluded rows (user chose to exclude these from import)
      if (excludeSet.has(rowNumber)) {
        continue
      }

      // Skip rows where all required fields are empty (effectively empty rows with just commas)
      const hasAnyRequiredData = [
        row.SN,
        row.RANK,
        row['LAST NAME'],
        row['FIRST NAME'],
        row.DEPT,
      ].some(field => field && field.trim() !== '')

      if (!hasAnyRequiredData) {
        // Silently skip completely empty rows - they're not validation errors, just trailing data
        continue
      }

      // Build context object with available data for error identification
      const errorContext = {
        rank: row.RANK?.trim() || undefined,
        firstName: row['FIRST NAME']?.trim() || undefined,
        lastName: row['LAST NAME']?.trim() || undefined,
        serviceNumber: row.SN?.trim() || undefined,
        department: row.DEPT?.trim() || undefined,
      }

      // Validate required fields
      if (!row.SN || row.SN.trim() === '') {
        errors.push({
          row: rowNumber,
          field: 'SN',
          message: 'Service number is required',
          excludable: true,
          context: errorContext,
        })
        continue
      }

      if (!row.RANK || row.RANK.trim() === '') {
        errors.push({
          row: rowNumber,
          field: 'RANK',
          message: 'Rank is required',
          excludable: true,
          context: errorContext,
        })
        continue
      }

      if (!row['LAST NAME'] || row['LAST NAME'].trim() === '') {
        errors.push({
          row: rowNumber,
          field: 'LAST NAME',
          message: 'Last name is required',
          excludable: true,
          context: errorContext,
        })
        continue
      }

      if (!row['FIRST NAME'] || row['FIRST NAME'].trim() === '') {
        errors.push({
          row: rowNumber,
          field: 'FIRST NAME',
          message: 'First name is required',
          excludable: true,
          context: errorContext,
        })
        continue
      }

      if (!row.DEPT || row.DEPT.trim() === '') {
        errors.push({
          row: rowNumber,
          field: 'DEPT',
          message: 'Department is required',
          excludable: true,
          context: errorContext,
        })
        continue
      }

      // Validate email format if provided
      if (row['EMAIL ADDRESS'] && row['EMAIL ADDRESS'].trim() !== '') {
        const email = row['EMAIL ADDRESS'].trim()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push({
            row: rowNumber,
            field: 'EMAIL ADDRESS',
            message: 'Invalid email format',
            excludable: true,
            context: errorContext,
          })
          continue
        }
      }

      // Create NominalRollRow object
      const nominalRollRow: NominalRollRow = {
        serviceNumber: row.SN.trim().replace(/\s+/g, ''),
        employeeNumber: row['EMPL #']?.trim() || undefined,
        rank: row.RANK.trim() as
          | 'AB'
          | 'LS'
          | 'OS'
          | 'S3'
          | 'S2'
          | 'S1'
          | 'MS'
          | 'PO2'
          | 'PO1'
          | 'CPO2'
          | 'CPO1',
        lastName: toNameCase(row['LAST NAME'].trim()),
        firstName: toNameCase(row['FIRST NAME'].trim()),
        initials: row.INITIALS?.trim() || undefined,
        department: row.DEPT.trim(),
        mess: row.MESS?.trim() || undefined,
        moc: row.MOC?.trim() || undefined,
        email: row['EMAIL ADDRESS']?.trim() || undefined,
        homePhone: row['HOME PHONE']?.trim() || undefined,
        mobilePhone: row['MOBILE PHONE']?.trim() || undefined,
        details: row.DETAILS?.trim() || undefined,
      }

      rows.push(nominalRollRow)
    }

    return { rows, errors }
  }

  /**
   * Derive member type from DETAILS field
   * Maps Nominal Roll details to MemberType enum
   */
  private deriveMemberType(details?: string): MemberType {
    if (!details) {
      return 'class_a'
    }

    const upper = details.toUpperCase()

    // Check for Class B
    if (upper.includes('CLASS B') || upper.includes('CLASSB')) {
      return 'class_b'
    }

    // Check for Class C
    if (upper.includes('CLASS C') || upper.includes('CLASSC')) {
      return 'class_c'
    }

    // Check for Regular Force
    if (upper.includes('REG FORCE') || upper.includes('REGFORCE') || upper.includes('REGULAR')) {
      return 'reg_force'
    }

    // Default to Class A (standard reserve)
    return 'class_a'
  }

  /**
   * Check if member data has changed
   */
  private hasChanges(
    current: Member,
    incoming: NominalRollRow,
    divisionId: string
  ): { hasChanges: boolean; changes: string[] } {
    const changes: string[] = []

    // Check service number
    if (current.serviceNumber !== incoming.serviceNumber) {
      changes.push(`Service number: ${current.serviceNumber} → ${incoming.serviceNumber}`)
    }

    // Check employee number
    const currentEmpNum = current.employeeNumber || ''
    const incomingEmpNum = incoming.employeeNumber || ''
    if (currentEmpNum !== incomingEmpNum) {
      changes.push(
        `Employee #: ${currentEmpNum || '(none)'} → ${incomingEmpNum || '(none)'}`
      )
    }

    // Check rank
    if (current.rank !== incoming.rank) {
      changes.push(`Rank: ${current.rank} → ${incoming.rank}`)
    }

    // Check first name
    if (current.firstName !== incoming.firstName) {
      changes.push(`First name: ${current.firstName} → ${incoming.firstName}`)
    }

    // Check last name
    if (current.lastName !== incoming.lastName) {
      changes.push(`Last name: ${current.lastName} → ${incoming.lastName}`)
    }

    // Check initials
    const currentInitials = current.initials || ''
    const incomingInitials = incoming.initials || ''
    if (currentInitials !== incomingInitials) {
      changes.push(
        `Initials: ${currentInitials || '(none)'} → ${incomingInitials || '(none)'}`
      )
    }

    // Check division
    if (current.divisionId !== divisionId) {
      changes.push(`Division changed`)
    }

    // Check email
    const currentEmail = current.email || ''
    const incomingEmail = incoming.email || ''
    if (currentEmail !== incomingEmail) {
      changes.push(`Email: ${currentEmail || '(none)'} → ${incomingEmail || '(none)'}`)
    }

    // Check phones
    const currentMobile = current.mobilePhone || ''
    const incomingMobile = incoming.mobilePhone || ''
    if (currentMobile !== incomingMobile) {
      changes.push(
        `Mobile: ${currentMobile || '(none)'} → ${incomingMobile || '(none)'}`
      )
    }

    const currentHome = current.homePhone || ''
    const incomingHome = incoming.homePhone || ''
    if (currentHome !== incomingHome) {
      changes.push(`Home phone: ${currentHome || '(none)'} → ${incomingHome || '(none)'}`)
    }

    // Check mess
    const currentMess = current.mess || ''
    const incomingMess = incoming.mess || ''
    if (currentMess !== incomingMess) {
      changes.push(`Mess: ${currentMess || '(none)'} → ${incomingMess || '(none)'}`)
    }

    // Check MOC
    const currentMoc = current.moc || ''
    const incomingMoc = incoming.moc || ''
    if (currentMoc !== incomingMoc) {
      changes.push(`MOC: ${currentMoc || '(none)'} → ${incomingMoc || '(none)'}`)
    }

    // Check class details
    const currentDetails = current.classDetails || ''
    const incomingDetails = incoming.details || ''
    if (currentDetails !== incomingDetails) {
      changes.push(
        `Details: ${currentDetails || '(none)'} → ${incomingDetails || '(none)'}`
      )
    }

    // Check member type
    const incomingType = this.deriveMemberType(incoming.details)
    if (current.memberType !== incomingType) {
      changes.push(`Member type: ${current.memberType} → ${incomingType}`)
    }

    return {
      hasChanges: changes.length > 0,
      changes,
    }
  }

  /**
   * Preview import without making changes
   * @param csvText - The raw CSV text
   * @param excludeRows - Optional array of row numbers to skip
   */
  async generatePreview(csvText: string, excludeRows?: number[]): Promise<PreviewImportResponse> {
    // Parse CSV
    const { rows, errors } = this.parseCSV(csvText, excludeRows)

    // Check for non-excludable errors (like CSV parsing errors)
    const nonExcludableErrors = errors.filter(e => e.excludable === false)
    if (nonExcludableErrors.length > 0) {
      return {
        toAdd: [],
        toUpdate: [],
        toReview: [],
        errors,
        divisionMapping: {},
      }
    }

    // If there are excludable errors and no excludeRows specified, return errors for user decision
    // If excludeRows is specified, those rows are already filtered out by parseCSV
    if (errors.length > 0 && !excludeRows) {
      return {
        toAdd: [],
        toUpdate: [],
        toReview: [],
        errors,
        divisionMapping: {},
      }
    }

    // Get all divisions
    const divisions = await this.divisionRepository.findAll()
    const divisionMapping: Record<string, string> = {}

    // Map departments to division IDs and detect missing ones
    const unknownDepartments = new Map<string, number>() // code -> count of members
    for (const row of rows) {
      const division = divisions.find(
        (d) => d.code.toUpperCase() === row.department.toUpperCase()
      )

      if (division) {
        divisionMapping[row.department] = division.id
      } else {
        // Track unknown department with member count
        const currentCount = unknownDepartments.get(row.department.toUpperCase()) || 0
        unknownDepartments.set(row.department.toUpperCase(), currentCount + 1)
      }
    }

    // Build list of divisions to create (instead of errors)
    const divisionsToCreate: DivisionToCreate[] = []
    if (unknownDepartments.size > 0) {
      for (const [deptCode, memberCount] of unknownDepartments) {
        divisionsToCreate.push({
          code: deptCode,
          name: DEPARTMENT_CODE_NAMES[deptCode] || deptCode, // Use mapped name or code as fallback
          memberCount,
        })
      }
    }

    // Get existing members by service numbers
    const serviceNumbers = rows.map((r) => r.serviceNumber)
    const existingMembers = await this.memberRepository.findByServiceNumbers(serviceNumbers)
    const existingMembersMap = new Map(existingMembers.map((m) => [m.serviceNumber, m]))

    // Get all active members to check for deactivations
    const allActiveMembers = await this.memberRepository.findAll({ status: 'active' })
    const csvServiceNumbers = new Set(serviceNumbers)

    // Categorize rows
    const toAdd: NominalRollRow[] = []
    const toUpdate: Array<{
      current: {
        id: string
        serviceNumber: string
        rank: string
        firstName: string
        lastName: string
        divisionId: string
        email?: string
        mobilePhone?: string
      }
      incoming: NominalRollRow
      changes: string[]
    }> = []

    for (const row of rows) {
      const existing = existingMembersMap.get(row.serviceNumber)
      const divisionId = divisionMapping[row.department]

      // If division doesn't exist, we'll still categorize the row but note the division needs to be created
      // The division will be created during executeImport if user chooses to

      if (!existing) {
        // New member
        toAdd.push(row)
      } else {
        // Check for changes (use existing divisionId if new one doesn't exist yet)
        const effectiveDivisionId = divisionId || existing.divisionId
        const { hasChanges, changes } = this.hasChanges(existing, row, effectiveDivisionId)

        // If division is changing to a new one that doesn't exist yet, note it
        if (!divisionId && existing.divisionId) {
          changes.push(`Division: will change to ${row.department} (to be created)`)
        }

        if (hasChanges || !divisionId) {
          toUpdate.push({
            current: {
              id: existing.id,
              serviceNumber: existing.serviceNumber,
              rank: existing.rank,
              firstName: existing.firstName,
              lastName: existing.lastName,
              divisionId: existing.divisionId,
              email: existing.email,
              mobilePhone: existing.mobilePhone,
            },
            incoming: row,
            changes,
          })
        }
      }
    }

    // Find members not in CSV (potential deactivations)
    const toReview = allActiveMembers
      .filter((m) => !csvServiceNumbers.has(m.serviceNumber))
      .map((m) => ({
        id: m.id,
        serviceNumber: m.serviceNumber,
        rank: m.rank,
        firstName: m.firstName,
        lastName: m.lastName,
        divisionId: m.divisionId,
      }))

    return {
      toAdd,
      toUpdate,
      toReview,
      errors,
      divisionMapping,
      divisionsToCreate: divisionsToCreate.length > 0 ? divisionsToCreate : undefined,
    }
  }

  /**
   * Create divisions that don't exist yet
   */
  private async createMissingDivisions(divisionsToCreate: DivisionToCreate[]): Promise<Record<string, string>> {
    const newDivisionMapping: Record<string, string> = {}

    for (const div of divisionsToCreate) {
      const created = await this.divisionRepository.create({
        code: div.code,
        name: div.name,
      })
      newDivisionMapping[div.code] = created.id
    }

    return newDivisionMapping
  }

  /**
   * Get or create member types from a list of codes
   * Returns a mapping of code -> id
   */
  private async getOrCreateMemberTypes(typeCodes: MemberType[]): Promise<Record<string, string>> {
    const mapping: Record<string, string> = {}
    const uniqueCodes = [...new Set(typeCodes)]

    for (const code of uniqueCodes) {
      const name = MEMBER_TYPE_NAMES[code] || code
      const memberType = await this.memberTypeRepository.upsertByCode(code, name)
      mapping[code] = memberType.id
    }

    return mapping
  }

  /**
   * Execute import and create/update members
   * @param csvText - The raw CSV text
   * @param deactivateIds - Optional array of member IDs to deactivate
   * @param excludeRows - Optional array of row numbers to skip (for continuing import despite errors)
   * @param createDivisions - Whether to auto-create missing divisions
   */
  async executeImport(
    csvText: string,
    deactivateIds?: string[],
    excludeRows?: number[],
    createDivisions?: boolean
  ): Promise<ExecuteImportResponse> {
    // Re-run preview to get latest state (with excluded rows filtered out)
    const preview = await this.generatePreview(csvText, excludeRows)

    // Block execution if there are non-excludable errors
    const blockingErrors = preview.errors.filter(e => e.excludable === false)
    if (blockingErrors.length > 0) {
      return {
        added: 0,
        updated: 0,
        flaggedForReview: 0,
        errors: preview.errors,
      }
    }

    // Create missing divisions if requested
    const divisionMapping = { ...preview.divisionMapping }
    if (createDivisions && preview.divisionsToCreate && preview.divisionsToCreate.length > 0) {
      const newDivisions = await this.createMissingDivisions(preview.divisionsToCreate)
      // Merge new division IDs into mapping
      Object.assign(divisionMapping, newDivisions)
    }

    // Get or create member types from all rows
    const allMemberTypes = [
      ...preview.toAdd.map((row) => this.deriveMemberType(row.details)),
      ...preview.toUpdate.map((item) => this.deriveMemberType(item.incoming.details)),
    ]
    const memberTypeMapping = await this.getOrCreateMemberTypes(allMemberTypes)

    let added = 0
    let updated = 0
    let flaggedForReview = 0

    // Helper to get division ID (checks both original case and uppercase)
    const getDivisionId = (dept: string): string | undefined =>
      divisionMapping[dept] || divisionMapping[dept.toUpperCase()]

    // Create new members
    if (preview.toAdd.length > 0) {
      const membersToCreate: CreateMemberInput[] = preview.toAdd
        .filter((row) => getDivisionId(row.department))
        .map((row) => {
          const memberType = this.deriveMemberType(row.details)
          return {
            serviceNumber: row.serviceNumber,
            employeeNumber: row.employeeNumber,
            firstName: row.firstName,
            lastName: row.lastName,
            initials: row.initials,
            rank: row.rank,
            divisionId: getDivisionId(row.department)!,
            mess: row.mess,
            moc: row.moc,
            memberType,
            memberTypeId: memberTypeMapping[memberType],
            classDetails: row.details,
            status: 'active',
            email: row.email,
            homePhone: row.homePhone,
            mobilePhone: row.mobilePhone,
          }
        })

      added = await this.memberRepository.bulkCreate(membersToCreate)
    }

    // Update existing members
    if (preview.toUpdate.length > 0) {
      const membersToUpdate: Array<{ id: string } & UpdateMemberInput> = preview.toUpdate
        .filter((item) => getDivisionId(item.incoming.department))
        .map((item) => {
          const memberType = this.deriveMemberType(item.incoming.details)
          return {
            id: item.current.id,
            serviceNumber: item.incoming.serviceNumber,
            employeeNumber: item.incoming.employeeNumber,
            firstName: item.incoming.firstName,
            lastName: item.incoming.lastName,
            initials: item.incoming.initials,
            rank: item.incoming.rank,
            divisionId: getDivisionId(item.incoming.department)!,
            mess: item.incoming.mess,
            moc: item.incoming.moc,
            memberType,
            memberTypeId: memberTypeMapping[memberType],
            classDetails: item.incoming.details,
            email: item.incoming.email,
            homePhone: item.incoming.homePhone,
            mobilePhone: item.incoming.mobilePhone,
          }
        })

      updated = await this.memberRepository.bulkUpdate(membersToUpdate)
    }

    // Deactivate members if requested
    if (deactivateIds && deactivateIds.length > 0) {
      for (const id of deactivateIds) {
        await this.memberRepository.update(id, { status: 'inactive' })
        flaggedForReview++
      }
    }

    // Sync auto-qualifications for all members after import (non-blocking)
    try {
      const autoQualService = new AutoQualificationService(getPrismaClient())
      await autoQualService.syncAll()
    } catch {
      // Non-blocking: don't fail import if auto-qual sync errors
    }

    importLogger.info(`Import complete: ${added} added, ${updated} updated, ${flaggedForReview} deactivated`)

    return {
      added,
      updated,
      flaggedForReview,
      errors: [],
    }
  }

  /**
   * Parse Excel sheets (not used for Nominal Roll, but kept for future)
   */
  parseExcelSheets(_buffer: Buffer): string[] {
    throw new Error('Excel parsing not yet implemented (Phase 3)')
  }

  /**
   * Parse Excel to CSV (not used for Nominal Roll, but kept for future)
   */
  parseExcelToCSV(_buffer: Buffer, _sheetName: string): string {
    throw new Error('Excel to CSV conversion not yet implemented (Phase 3)')
  }

  /**
   * Parse CSV headers (not used for Nominal Roll, but kept for future)
   */
  parseHeaders(_csvText: string): string[] {
    throw new Error('CSV header parsing not yet implemented (Phase 3)')
  }

  /**
   * Detect divisions from CSV data (not used for Nominal Roll, but kept for future)
   */
  async detectDivisions(_csvText: string, _mapping: unknown): Promise<string[]> {
    throw new Error('Division detection not yet implemented (Phase 3)')
  }

  /**
   * Auto-map columns (not used for Nominal Roll, but kept for future)
   */
  autoMapColumns(_headers: string[]): Record<string, string> {
    throw new Error('Auto column mapping not yet implemented (Phase 3)')
  }
}

export const importService = new ImportService()
