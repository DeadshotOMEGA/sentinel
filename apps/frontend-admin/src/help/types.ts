export type ProcedurePersona = 'admin' | 'dds' | 'duty_watch' | 'user' | 'visitor_kiosk'

export type ProcedureStatus = 'idle' | 'in_progress' | 'completed' | 'skipped' | 'aborted'

export interface ProcedureContext {
  route: string
  accountLevel: number
  memberId: string
  featureFlags: Record<string, boolean>
}

export interface ProcedurePopover {
  title: string
  description: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

export interface ProcedureStepTransition {
  to: string
  when?: (context: ProcedureContext) => boolean
}

export interface ProcedureStep {
  id: string
  target?: string
  popover: ProcedurePopover
  before?: (context: ProcedureContext) => Promise<void> | void
  after?: (context: ProcedureContext) => Promise<void> | void
  next?: ProcedureStepTransition[]
}

export interface ProcedureDefinition {
  id: string
  version: number
  title: string
  summary: string
  route: string
  personas: ProcedurePersona[]
  guards?: Array<(context: ProcedureContext) => boolean>
  steps: ProcedureStep[]
}

export interface ProcedureProgress {
  procedureId: string
  version: number
  memberId: string
  route: string
  status: ProcedureStatus
  stepIndex: number
  updatedAt: string
}

export type ProcedureEventType =
  | 'procedure_started'
  | 'step_viewed'
  | 'procedure_completed'
  | 'procedure_skipped'
  | 'procedure_aborted'
  | 'procedure_error'

export interface ProcedureEvent {
  type: ProcedureEventType
  procedureId: string
  version: number
  stepId?: string
  stepIndex?: number
  memberId: string
  route: string
  message?: string
}

export interface ProcedureState {
  procedureId: string | null
  stepIndex: number
  status: ProcedureStatus
}

export interface ProcedureController {
  start: (procedureId: string) => Promise<boolean>
  resume: (procedureId: string) => Promise<boolean>
  restart: (procedureId: string) => Promise<boolean>
  next: () => Promise<void>
  back: () => Promise<void>
  skip: () => Promise<void>
  complete: () => Promise<void>
  abort: () => Promise<void>
  getState: () => ProcedureState
  dispose: () => void
}

export interface ProcedureDriverHandlers {
  onNext: () => void | Promise<void>
  onPrev: () => void | Promise<void>
  onClose: () => void | Promise<void>
  onHighlighted: (index: number) => void
}

export interface ProcedureDriver {
  mount: (definition: ProcedureDefinition, handlers: ProcedureDriverHandlers) => Promise<void>
  drive: (startIndex: number) => void
  moveTo: (index: number) => void
  destroy: () => void
  isActive: () => boolean
}
