import * as v from 'valibot'

const normalizeCode = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

export const RemoteSystemIdSchema = v.pipe(
  v.string('Remote system ID is required'),
  v.uuid('Remote system ID must be a valid UUID')
)

export const RemoteSystemCodeSchema = v.pipe(
  v.string('Remote system code is required'),
  v.minLength(1, 'Remote system code cannot be empty'),
  v.maxLength(50, 'Remote system code must be at most 50 characters'),
  v.transform(normalizeCode)
)

export const RemoteSystemNameSchema = v.pipe(
  v.string('Remote system name is required'),
  v.transform((value) => value.trim()),
  v.minLength(1, 'Remote system name cannot be empty'),
  v.maxLength(100, 'Remote system name must be at most 100 characters')
)

export const RemoteSystemDescriptionSchema = v.optional(
  v.pipe(
    v.string('Description must be a string'),
    v.transform((value) => value.trim()),
    v.maxLength(500, 'Description must be at most 500 characters')
  )
)

export const CreateRemoteSystemSchema = v.object({
  code: RemoteSystemCodeSchema,
  name: RemoteSystemNameSchema,
  description: RemoteSystemDescriptionSchema,
  displayOrder: v.optional(v.number('Display order must be a number')),
})

export const UpdateRemoteSystemSchema = v.object({
  code: v.optional(RemoteSystemCodeSchema),
  name: v.optional(RemoteSystemNameSchema),
  description: RemoteSystemDescriptionSchema,
  displayOrder: v.optional(v.number('Display order must be a number')),
  isActive: v.optional(v.boolean('isActive must be a boolean')),
})

export const ReorderRemoteSystemsSchema = v.object({
  remoteSystemIds: v.pipe(
    v.array(RemoteSystemIdSchema),
    v.minLength(1, 'At least one remote system ID is required')
  ),
})

export const RemoteSystemOptionSchema = v.object({
  id: v.string(),
  code: v.string(),
  name: v.string(),
  description: v.nullable(v.string()),
  displayOrder: v.number(),
  isOccupied: v.boolean(),
})

export const RemoteSystemLoginContextSchema = v.object({
  isHostDevice: v.boolean(),
  forcedRemoteSystemId: v.nullable(RemoteSystemIdSchema),
})

export const RemoteSystemsResponseSchema = v.object({
  systems: v.array(RemoteSystemOptionSchema),
  loginContext: RemoteSystemLoginContextSchema,
})

export const AdminRemoteSystemSchema = v.object({
  id: v.string(),
  code: v.string(),
  name: v.string(),
  description: v.nullable(v.string()),
  displayOrder: v.number(),
  isActive: v.boolean(),
  usageCount: v.number(),
  activeSessionCount: v.number(),
  createdAt: v.string(),
  updatedAt: v.string(),
})

export const AdminRemoteSystemsResponseSchema = v.object({
  systems: v.array(AdminRemoteSystemSchema),
})

export const RemoteSystemResponseSchema = v.object({
  system: AdminRemoteSystemSchema,
})

export type CreateRemoteSystemInput = v.InferOutput<typeof CreateRemoteSystemSchema>
export type UpdateRemoteSystemInput = v.InferOutput<typeof UpdateRemoteSystemSchema>
export type ReorderRemoteSystemsInput = v.InferOutput<typeof ReorderRemoteSystemsSchema>
export type RemoteSystemOption = v.InferOutput<typeof RemoteSystemOptionSchema>
export type RemoteSystemLoginContext = v.InferOutput<typeof RemoteSystemLoginContextSchema>
export type RemoteSystemsResponse = v.InferOutput<typeof RemoteSystemsResponseSchema>
export type AdminRemoteSystem = v.InferOutput<typeof AdminRemoteSystemSchema>
export type AdminRemoteSystemsResponse = v.InferOutput<typeof AdminRemoteSystemsResponseSchema>
export type RemoteSystemResponse = v.InferOutput<typeof RemoteSystemResponseSchema>
