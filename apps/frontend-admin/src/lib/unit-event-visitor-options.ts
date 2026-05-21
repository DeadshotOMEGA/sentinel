const ALLOW_GENERAL_EVENT_VISITOR_OPTION_KEY = 'allowGeneralEventVisitorOption'

export function allowsGeneralEventVisitorOption(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false
  }

  return (metadata as Record<string, unknown>)[ALLOW_GENERAL_EVENT_VISITOR_OPTION_KEY] === true
}

export function buildUnitEventMetadataWithGeneralVisitorOption(
  metadata: Record<string, unknown> | null,
  allowGeneralEventVisitorOption: boolean
): Record<string, unknown> | null {
  const nextMetadata = { ...(metadata ?? {}) }

  if (allowGeneralEventVisitorOption) {
    nextMetadata[ALLOW_GENERAL_EVENT_VISITOR_OPTION_KEY] = true
  } else {
    delete nextMetadata[ALLOW_GENERAL_EVENT_VISITOR_OPTION_KEY]
  }

  return Object.keys(nextMetadata).length > 0 ? nextMetadata : null
}
