import * as v from 'valibot'

export const ApprovedSsidSchema = v.pipe(
  v.string('SSID is required'),
  v.transform((value) => value.trim()),
  v.minLength(1, 'SSID cannot be empty'),
  v.maxLength(100, 'SSID must be at most 100 characters')
)

export const NetworkSettingsSchema = v.pipe(
  v.object({
    approvedSsids: v.array(ApprovedSsidSchema),
  }),
  v.check(
    ({ approvedSsids }) =>
      new Set(approvedSsids.map((ssid) => ssid.toLowerCase())).size === approvedSsids.length,
    'Approved SSIDs must be unique'
  )
)

export const NetworkSettingsMetadataSchema = v.object({
  source: v.picklist(['default', 'stored']),
  updatedAt: v.nullable(v.string()),
})

export const NetworkSettingsResponseSchema = v.object({
  settings: NetworkSettingsSchema,
  metadata: NetworkSettingsMetadataSchema,
})

export const UpdateNetworkSettingsSchema = v.object({
  settings: NetworkSettingsSchema,
})

export type NetworkSettings = v.InferOutput<typeof NetworkSettingsSchema>
export type NetworkSettingsMetadata = v.InferOutput<typeof NetworkSettingsMetadataSchema>
export type NetworkSettingsResponse = v.InferOutput<typeof NetworkSettingsResponseSchema>
export type UpdateNetworkSettingsInput = v.InferOutput<typeof UpdateNetworkSettingsSchema>
