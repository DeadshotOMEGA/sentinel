import * as v from 'valibot'
import { RankCodeSchema } from './member.schema.js'

/**
 * Import error context - available data from the row for identification
 */
export const ImportErrorContextSchema = v.object({
  rank: v.optional(v.string()),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  serviceNumber: v.optional(v.string()),
  department: v.optional(v.string()),
})

export type ImportErrorContext = v.InferOutput<typeof ImportErrorContextSchema>

/**
 * Import error schema
 */
export const ImportErrorSchema = v.object({
  row: v.number('Row number is required'),
  field: v.string('Field name is required'),
  message: v.string('Error message is required'),
  /** Whether this row can be excluded to continue import */
  excludable: v.optional(v.boolean()),
  /** Available context from the row for identification */
  context: v.optional(ImportErrorContextSchema),
})

export type ImportError = v.InferOutput<typeof ImportErrorSchema>

/**
 * Nominal Roll CSV row schema
 * Represents a single row from the Nominal Roll CSV file
 */
export const NominalRollRowSchema = v.object({
  serviceNumber: v.pipe(
    v.string('Service number is required'),
    v.minLength(1, 'Service number cannot be empty')
  ),
  employeeNumber: v.optional(v.string()),
  rank: RankCodeSchema,
  lastName: v.pipe(v.string('Last name is required'), v.minLength(1, 'Last name cannot be empty')),
  firstName: v.pipe(
    v.string('First name is required'),
    v.minLength(1, 'First name cannot be empty')
  ),
  initials: v.optional(v.string()),
  department: v.pipe(
    v.string('Department is required'),
    v.minLength(1, 'Department cannot be empty')
  ),
  mess: v.optional(v.string()),
  moc: v.optional(v.string()),
  email: v.optional(v.pipe(v.string(), v.email('Invalid email address'))),
  homePhone: v.optional(v.string()),
  mobilePhone: v.optional(v.string()),
  details: v.optional(v.string()),
})

export type NominalRollRow = v.InferOutput<typeof NominalRollRowSchema>

/**
 * Member with changes (for preview)
 */
export const MemberWithChangesSchema = v.object({
  current: v.object({
    id: v.pipe(v.string(), v.uuid()),
    serviceNumber: v.string(),
    rank: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    divisionId: v.pipe(v.string(), v.uuid()),
    email: v.optional(v.string()),
    mobilePhone: v.optional(v.string()),
  }),
  incoming: NominalRollRowSchema,
  changes: v.array(v.string()),
})

export type MemberWithChanges = v.InferOutput<typeof MemberWithChangesSchema>

/**
 * Preview import request schema
 */
export const PreviewImportRequestSchema = v.object({
  csvText: v.pipe(v.string('CSV text is required'), v.minLength(1, 'CSV text cannot be empty')),
})

export type PreviewImportRequest = v.InferOutput<typeof PreviewImportRequestSchema>

/**
 * Division to create during import
 */
export const DivisionToCreateSchema = v.object({
  code: v.string(),
  name: v.string(),
  memberCount: v.number(),
})

export type DivisionToCreate = v.InferOutput<typeof DivisionToCreateSchema>

/**
 * Preview import response schema
 */
export const PreviewImportResponseSchema = v.object({
  toAdd: v.array(NominalRollRowSchema),
  toUpdate: v.array(MemberWithChangesSchema),
  toReview: v.array(
    v.object({
      id: v.pipe(v.string(), v.uuid()),
      serviceNumber: v.string(),
      rank: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      divisionId: v.pipe(v.string(), v.uuid()),
    })
  ),
  errors: v.array(ImportErrorSchema),
  divisionMapping: v.record(v.string(), v.pipe(v.string(), v.uuid())),
  /** Divisions that need to be created (not found in database) */
  divisionsToCreate: v.optional(v.array(DivisionToCreateSchema)),
})

export type PreviewImportResponse = v.InferOutput<typeof PreviewImportResponseSchema>

/**
 * Execute import request schema
 */
export const ExecuteImportRequestSchema = v.object({
  csvText: v.pipe(v.string('CSV text is required'), v.minLength(1, 'CSV text cannot be empty')),
  deactivateIds: v.optional(v.array(v.pipe(v.string(), v.uuid()))),
  /** Row numbers to exclude from import (allows continuing despite validation errors) */
  excludeRows: v.optional(v.array(v.number())),
  /** Create missing divisions automatically */
  createDivisions: v.optional(v.boolean()),
})

export type ExecuteImportRequest = v.InferOutput<typeof ExecuteImportRequestSchema>

/**
 * Execute import response schema
 */
export const ExecuteImportResponseSchema = v.object({
  added: v.number('Number of members added is required'),
  updated: v.number('Number of members updated is required'),
  flaggedForReview: v.number('Number of members flagged for review is required'),
  errors: v.array(ImportErrorSchema),
})

export type ExecuteImportResponse = v.InferOutput<typeof ExecuteImportResponseSchema>
