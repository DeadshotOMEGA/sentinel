import type { ProcedureProgress, ProcedureStatus } from './types'

const STORAGE_PREFIX = 'sentinel:procedure'

function buildKey(memberId: string, procedureId: string, version: number): string {
  return `${STORAGE_PREFIX}:${memberId}:${procedureId}:${version}`
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage
}

export function loadProcedureProgress(
  memberId: string,
  procedureId: string,
  version: number
): ProcedureProgress | null {
  if (!isBrowser()) return null

  const raw = window.localStorage.getItem(buildKey(memberId, procedureId, version))
  if (!raw) return null

  try {
    return JSON.parse(raw) as ProcedureProgress
  } catch {
    return null
  }
}

export function saveProcedureProgress(params: {
  memberId: string
  procedureId: string
  version: number
  route: string
  status: ProcedureStatus
  stepIndex: number
}): ProcedureProgress | null {
  if (!isBrowser()) return null

  const payload: ProcedureProgress = {
    memberId: params.memberId,
    procedureId: params.procedureId,
    version: params.version,
    route: params.route,
    status: params.status,
    stepIndex: params.stepIndex,
    updatedAt: new Date().toISOString(),
  }

  window.localStorage.setItem(
    buildKey(params.memberId, params.procedureId, params.version),
    JSON.stringify(payload)
  )

  return payload
}

export function clearProcedureProgress(
  memberId: string,
  procedureId: string,
  version: number
): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(buildKey(memberId, procedureId, version))
}
