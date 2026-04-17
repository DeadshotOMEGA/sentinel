import type { RemoteSystemLoginContext, RemoteSystemOption } from '@sentinel/contracts'

export interface PinInputInitialSelection {
  id: string
}

const DEFAULT_LOGIN_CONTEXT: RemoteSystemLoginContext = {
  isHostDevice: false,
  forcedRemoteSystemId: null,
}

export function normalizeLoginContext(
  loginContext: RemoteSystemLoginContext | null | undefined
): RemoteSystemLoginContext {
  return loginContext ?? DEFAULT_LOGIN_CONTEXT
}

export function resolveForcedRemoteSystem(
  remoteSystems: RemoteSystemOption[],
  loginContext: RemoteSystemLoginContext | null | undefined
): RemoteSystemOption | null {
  const normalizedLoginContext = normalizeLoginContext(loginContext)

  if (!normalizedLoginContext.isHostDevice || !normalizedLoginContext.forcedRemoteSystemId) {
    return null
  }

  return (
    remoteSystems.find((system) => system.id === normalizedLoginContext.forcedRemoteSystemId) ??
    null
  )
}

export function isSelectableRemoteSystem(
  system: RemoteSystemOption,
  loginContext: RemoteSystemLoginContext | null | undefined
): boolean {
  const normalizedLoginContext = normalizeLoginContext(loginContext)

  if (normalizedLoginContext.isHostDevice) {
    return system.id === normalizedLoginContext.forcedRemoteSystemId
  }

  return !system.isOccupied
}

export function resolveDefaultRemoteSystemId(input: {
  remoteSystems: RemoteSystemOption[]
  initialSelection?: PinInputInitialSelection | null
  loginContext?: RemoteSystemLoginContext | null
}): string {
  const { remoteSystems, initialSelection = null, loginContext = null } = input
  const normalizedLoginContext = normalizeLoginContext(loginContext)

  if (normalizedLoginContext.isHostDevice) {
    return normalizedLoginContext.forcedRemoteSystemId ?? ''
  }

  if (initialSelection) {
    const initialRemoteSystem = remoteSystems.find((system) => system.id === initialSelection.id)
    if (initialRemoteSystem && isSelectableRemoteSystem(initialRemoteSystem, normalizedLoginContext)) {
      return initialRemoteSystem.id
    }
  }

  return (
    remoteSystems.find((system) => isSelectableRemoteSystem(system, normalizedLoginContext))?.id ??
    ''
  )
}

export function resolveEffectiveRemoteSystemId(input: {
  remoteSystems: RemoteSystemOption[]
  selectedRemoteSystem: string
  initialSelection?: PinInputInitialSelection | null
  loginContext?: RemoteSystemLoginContext | null
}): string {
  const {
    remoteSystems,
    selectedRemoteSystem,
    initialSelection = null,
    loginContext = null,
  } = input
  const normalizedLoginContext = normalizeLoginContext(loginContext)

  if (normalizedLoginContext.isHostDevice) {
    return normalizedLoginContext.forcedRemoteSystemId ?? ''
  }

  if (selectedRemoteSystem.length > 0) {
    const activeSelection = remoteSystems.find((system) => system.id === selectedRemoteSystem)
    if (activeSelection && isSelectableRemoteSystem(activeSelection, normalizedLoginContext)) {
      return selectedRemoteSystem
    }
  }

  return resolveDefaultRemoteSystemId({
    remoteSystems,
    initialSelection,
    loginContext: normalizedLoginContext,
  })
}

export function formatRemoteSystemOptionLabel(
  system: RemoteSystemOption,
  loginContext: RemoteSystemLoginContext | null | undefined
): string {
  if (!isSelectableRemoteSystem(system, loginContext) && system.isOccupied) {
    return `${system.name} - In use`
  }

  return system.name
}
