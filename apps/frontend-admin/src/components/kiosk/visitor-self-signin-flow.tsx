'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import {
  buildReasonFirstVisitorPayload,
  getVisitorFinalInstructions,
  reasonRequiresBranch,
  reasonRequiresEventSelection,
  reasonRequiresMemberSelection,
  reasonUsesContractInputs,
  SELF_SERVICE_BRANCH_OPTIONS,
  SELF_SERVICE_REASON_OPTIONS,
  type SelfServiceVisitReason,
  type SelfServiceVisitType,
  type SelfServiceVisitorBranch,
} from '@/lib/visitor-self-signin'
import { useCreateVisitor } from '@/hooks/use-visitors'
import {
  TouchScreenKeyboard,
  type TouchKeyboardMode,
} from '@/components/kiosk/touch-screen-keyboard'
import { CalendarDays, CheckCircle2, ChevronRight, Search, UserRound, X } from 'lucide-react'

const FINAL_RESET_SECONDS = 15

export interface VisitorSelfSigninCompletion {
  title: string
  message: string
  actionLabel: string
}

interface VisitorSelfSigninFlowProps {
  kioskId: string
  layout?: 'modal' | 'inline'
  onCancel: () => void
  onComplete?: (completion: VisitorSelfSigninCompletion) => void
}

interface HostOption {
  id: string
  displayName: string
}

interface EventOption {
  id: string
  title: string
  eventDateLabel: string
}

type KeyboardFieldName =
  | 'rankPrefix'
  | 'initials'
  | 'firstName'
  | 'lastName'
  | 'unit'
  | 'organization'
  | 'workDescription'
  | 'licensePlate'
  | 'memberSearch'
  | 'eventSearch'

interface ActiveKeyboardField {
  name: KeyboardFieldName
  mode: TouchKeyboardMode
}

interface VisitorSelfSigninFormValues {
  reason: SelfServiceVisitReason | ''
  branch: SelfServiceVisitorBranch | ''
  rankPrefix: string
  initials: string
  firstName: string
  lastName: string
  unit: string
  organization: string
  workDescription: string
  licensePlate: string
  hostMemberId: string
  eventId: string
}

type FlowStep = 1 | 2 | 3 | 4 | 5

const DEFAULT_FORM_VALUES: VisitorSelfSigninFormValues = {
  reason: '',
  branch: '',
  rankPrefix: '',
  initials: '',
  firstName: '',
  lastName: '',
  unit: '',
  organization: '',
  workDescription: '',
  licensePlate: '',
  hostMemberId: '',
  eventId: '',
}

type KeyboardFieldElement = globalThis.HTMLInputElement | globalThis.HTMLTextAreaElement

function trimValue(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function formatEventDateLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function VisitorSelfSigninFlow({
  kioskId,
  layout = 'modal',
  onCancel,
  onComplete,
}: VisitorSelfSigninFlowProps) {
  const fieldRefs = useRef<Partial<Record<KeyboardFieldName, KeyboardFieldElement | null>>>({})
  const previousStepRef = useRef<FlowStep>(1)
  const createVisitor = useCreateVisitor()
  const [step, setStep] = useState<FlowStep>(1)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [eventSearch, setEventSearch] = useState('')
  const [selectedHost, setSelectedHost] = useState<HostOption | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventOption | null>(null)
  const [activeKeyboardField, setActiveKeyboardField] = useState<ActiveKeyboardField | null>(null)
  const [completionState, setCompletionState] = useState<VisitorSelfSigninCompletion | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(FINAL_RESET_SECONDS)

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    clearErrors,
    trigger,
    formState: { errors },
  } = useForm<VisitorSelfSigninFormValues>({
    defaultValues: DEFAULT_FORM_VALUES,
  })

  const reason = useWatch({ control, name: 'reason' })
  const branch = useWatch({ control, name: 'branch' })
  const rankPrefix = useWatch({ control, name: 'rankPrefix' })
  const initials = useWatch({ control, name: 'initials' })
  const firstName = useWatch({ control, name: 'firstName' })
  const lastName = useWatch({ control, name: 'lastName' })
  const unit = useWatch({ control, name: 'unit' })
  const organization = useWatch({ control, name: 'organization' })
  const workDescription = useWatch({ control, name: 'workDescription' })
  const licensePlate = useWatch({ control, name: 'licensePlate' })

  const requiresBranch = reason ? reasonRequiresBranch(reason) : false
  const requiresMemberSelection = reason ? reasonRequiresMemberSelection(reason) : false
  const requiresEventSelection = reason ? reasonRequiresEventSelection(reason) : false
  const allowsOptionalMemberSelection = reason === 'event'
  const showsMemberSelection = requiresMemberSelection || allowsOptionalMemberSelection
  const usesContractInputs = reason ? reasonUsesContractInputs(reason) : false
  const followsMilitaryPath = reason !== '' && reason !== 'recruitment' && branch === 'military'
  const followsCivilianPath = reason === 'recruitment' || branch === 'civilian'
  const hasSelectionStep = requiresMemberSelection || requiresEventSelection
  const selectionStep: FlowStep | null = hasSelectionStep ? 2 : null
  const routingStep: FlowStep | null = requiresBranch ? (hasSelectionStep ? 3 : 2) : null
  const personalInfoStep: FlowStep = (routingStep ? routingStep + 1 : 2) as FlowStep
  const contractInfoStep: FlowStep | null = usesContractInputs
    ? ((personalInfoStep + 1) as FlowStep)
    : null
  const reviewStep: FlowStep = (
    contractInfoStep ? contractInfoStep + 1 : personalInfoStep + 1
  ) as FlowStep

  const deferredMemberSearch = useDeferredValue(memberSearch.trim())
  const normalizedEventSearch = eventSearch.trim().toLowerCase()
  const isInline = layout === 'inline'

  const memberSearchQuery = useQuery({
    queryKey: ['kiosk-visitor-host-search', deferredMemberSearch],
    enabled: showsMemberSelection && deferredMemberSearch.length >= 2,
    queryFn: async () => {
      const response = await apiClient.members.getMembers({
        query: {
          page: '1',
          limit: '8',
          search: deferredMemberSearch,
          scope: 'all',
        },
      })

      if (response.status !== 200) {
        throw new Error('Failed to search members')
      }

      return response.body.members.map((member) => ({
        id: member.id,
        displayName: member.displayName ?? `${member.rank} ${member.lastName}, ${member.firstName}`,
      }))
    },
  })

  const eventListQuery = useQuery({
    queryKey: ['kiosk-unit-events'],
    enabled: requiresEventSelection,
    queryFn: async (): Promise<EventOption[]> => {
      const response = await apiClient.unitEvents.listUnitEvents({
        query: {
          limit: '100',
          offset: '0',
        },
      })

      if (response.status !== 200) {
        throw new Error('Failed to fetch events')
      }

      return response.body.data.map((event) => ({
        id: event.id,
        title: event.title,
        eventDateLabel: formatEventDateLabel(event.eventDate),
      }))
    },
  })

  const filteredEvents = useMemo(() => {
    if (!eventListQuery.data) return []

    if (!normalizedEventSearch) {
      return eventListQuery.data
    }

    return eventListQuery.data.filter((event) => {
      const haystack = `${event.title} ${event.eventDateLabel}`.toLowerCase()
      return haystack.includes(normalizedEventSearch)
    })
  }, [eventListQuery.data, normalizedEventSearch])

  const focusKeyboardField = (name: KeyboardFieldName, nextValueLength?: number) => {
    const fieldElement = fieldRefs.current[name]
    if (!fieldElement) return

    window.requestAnimationFrame(() => {
      fieldElement.focus({ preventScroll: true })
      fieldElement.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      })

      if (typeof nextValueLength === 'number') {
        fieldElement.setSelectionRange(nextValueLength, nextValueLength)
      }
    })
  }

  function registerFieldRef(name: KeyboardFieldName) {
    return (element: KeyboardFieldElement | null) => {
      fieldRefs.current[name] = element
    }
  }

  function activateKeyboardField(name: KeyboardFieldName, mode: TouchKeyboardMode = 'keyboard') {
    setActiveKeyboardField({ name, mode })
    focusKeyboardField(name)
  }

  useEffect(() => {
    if (reason === '') {
      setValue('branch', '')
      setSelectedHost(null)
      setSelectedEvent(null)
      setMemberSearch('')
      setEventSearch('')
      setValue('hostMemberId', '')
      setValue('eventId', '')
      return
    }

    if (!requiresBranch) {
      setValue('branch', '')
      clearErrors('branch')
    }

    if (!showsMemberSelection) {
      setSelectedHost(null)
      setMemberSearch('')
      setValue('hostMemberId', '')
      clearErrors('hostMemberId')
    }

    if (!requiresEventSelection) {
      setSelectedEvent(null)
      setEventSearch('')
      setValue('eventId', '')
      clearErrors('eventId')
    }

    if (!usesContractInputs) {
      setValue('organization', '')
      setValue('workDescription', '')
      setValue('licensePlate', '')
      clearErrors('organization')
      clearErrors('workDescription')
    }
  }, [
    clearErrors,
    reason,
    requiresBranch,
    requiresEventSelection,
    showsMemberSelection,
    setValue,
    usesContractInputs,
  ])

  useEffect(() => {
    if (step > reviewStep) {
      setStep(reviewStep)
    }
  }, [reviewStep, step])

  useEffect(() => {
    if (completionState) {
      setActiveKeyboardField(null)
      return
    }

    if (!activeKeyboardField) return

    const visibleFields = new Set<KeyboardFieldName>()

    if (selectionStep !== null && step === selectionStep) {
      if (showsMemberSelection && !selectedHost) {
        visibleFields.add('memberSearch')
      }

      if (requiresEventSelection && !selectedEvent) {
        visibleFields.add('eventSearch')
      }
    }

    if (step === personalInfoStep) {
      if (followsMilitaryPath) {
        visibleFields.add('rankPrefix')
        visibleFields.add('lastName')
        visibleFields.add('initials')
        visibleFields.add('unit')
      } else if (followsCivilianPath) {
        visibleFields.add('firstName')
        visibleFields.add('lastName')
      }
    }

    if (contractInfoStep !== null && step === contractInfoStep) {
      visibleFields.add('organization')
      visibleFields.add('workDescription')
    }

    if (step === reviewStep) {
      visibleFields.add('licensePlate')
    }

    if (!visibleFields.has(activeKeyboardField.name)) {
      setActiveKeyboardField(null)
    }
  }, [
    activeKeyboardField,
    completionState,
    followsCivilianPath,
    followsMilitaryPath,
    contractInfoStep,
    personalInfoStep,
    requiresEventSelection,
    reviewStep,
    selectionStep,
    selectedEvent,
    selectedHost,
    showsMemberSelection,
    step,
  ])

  useEffect(() => {
    const previousStep = previousStepRef.current
    previousStepRef.current = step

    if (completionState) return
    if (activeKeyboardField) return
    if (step === previousStep) return

    const activateStepField = (name: KeyboardFieldName, mode: TouchKeyboardMode = 'keyboard') => {
      setActiveKeyboardField({ name, mode })

      window.requestAnimationFrame(() => {
        const fieldElement = fieldRefs.current[name]
        if (!fieldElement) return

        fieldElement.focus({ preventScroll: true })
        fieldElement.scrollIntoView({
          block: 'nearest',
          inline: 'nearest',
        })
      })
    }

    if (selectionStep !== null && step === selectionStep) {
      if (showsMemberSelection && !selectedHost) {
        activateStepField('memberSearch')
        return
      }

      if (requiresEventSelection && !selectedEvent) {
        activateStepField('eventSearch')
      }

      return
    }

    if (step === personalInfoStep) {
      if (followsMilitaryPath) {
        activateStepField('rankPrefix')
        return
      }

      if (followsCivilianPath) {
        activateStepField('firstName')
        return
      }
    }

    if (contractInfoStep !== null && step === contractInfoStep) {
      activateStepField('organization')
      return
    }

    if (step === reviewStep) {
      activateStepField('licensePlate')
    }
  }, [
    activeKeyboardField,
    completionState,
    contractInfoStep,
    followsCivilianPath,
    followsMilitaryPath,
    personalInfoStep,
    requiresEventSelection,
    reviewStep,
    selectionStep,
    selectedEvent,
    selectedHost,
    showsMemberSelection,
    step,
  ])

  useEffect(() => {
    if (isInline || !completionState) return

    setSecondsRemaining(FINAL_RESET_SECONDS)

    const interval = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(interval)
          onCancel()
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [completionState, isInline, onCancel])

  const handleReasonSelect = (value: SelfServiceVisitReason) => {
    setValue('reason', value, { shouldValidate: true })
    clearErrors('reason')

    if (value === 'recruitment') {
      setValue('branch', '')
      clearErrors('branch')
    }

    if (step === 1) {
      setStep(hasSelectionStep ? 2 : ((routingStep ?? personalInfoStep) as FlowStep))
    }
  }

  const handleBranchSelect = (value: SelfServiceVisitorBranch) => {
    setValue('branch', value, { shouldValidate: true })
    clearErrors('branch')

    const isOnRoutingStep = routingStep !== null && step === routingStep
    if (isOnRoutingStep) {
      setStep(personalInfoStep)
    }
  }

  const handleSelectHost = (host: HostOption) => {
    setSelectedHost(host)
    setMemberSearch('')
    setValue('hostMemberId', host.id, { shouldValidate: true })
    clearErrors('hostMemberId')
  }

  const handleClearHost = () => {
    setSelectedHost(null)
    setValue('hostMemberId', '')
  }

  const handleSelectEvent = (event: EventOption) => {
    setSelectedEvent(event)
    setEventSearch('')
    setValue('eventId', event.id, { shouldValidate: true })
    clearErrors('eventId')
  }

  const handleClearEvent = () => {
    setSelectedEvent(null)
    setValue('eventId', '')
  }

  const getKeyboardFieldOrder = (): KeyboardFieldName[] => {
    if (selectionStep !== null && step === selectionStep) {
      const fields: KeyboardFieldName[] = []

      if (showsMemberSelection && !selectedHost) {
        fields.push('memberSearch')
      }

      if (requiresEventSelection && !selectedEvent) {
        fields.push('eventSearch')
      }

      return fields
    }

    if (step === personalInfoStep) {
      const fields: KeyboardFieldName[] = []

      if (followsMilitaryPath) {
        fields.push('rankPrefix', 'lastName', 'initials', 'unit')
      } else if (followsCivilianPath) {
        fields.push('firstName', 'lastName')
      }

      return fields
    }

    if (contractInfoStep !== null && step === contractInfoStep) {
      const fields: KeyboardFieldName[] = []
      fields.push('organization', 'workDescription')
      return fields
    }

    if (step === reviewStep) {
      return ['licensePlate']
    }

    return []
  }

  const handleKeyboardValueChange = (value: string) => {
    if (!activeKeyboardField) return

    if (activeKeyboardField.name === 'memberSearch') {
      setMemberSearch(value)
      focusKeyboardField('memberSearch', value.length)
      return
    }

    if (activeKeyboardField.name === 'eventSearch') {
      setEventSearch(value)
      focusKeyboardField('eventSearch', value.length)
      return
    }

    const fieldName = activeKeyboardField.name

    setValue(fieldName, value, {
      shouldDirty: true,
      shouldTouch: true,
    })
    clearErrors(fieldName)
    focusKeyboardField(fieldName, value.length)
  }

  const handleKeyboardPrevious = () => {
    if (!activeKeyboardField) return

    const fields = getKeyboardFieldOrder()
    const currentIndex = fields.indexOf(activeKeyboardField.name)

    if (currentIndex <= 0) {
      return
    }

    const previousField = fields[currentIndex - 1]
    activateKeyboardField(previousField)
  }

  const handleKeyboardNext = () => {
    if (!activeKeyboardField) return

    const fields = getKeyboardFieldOrder()
    const currentIndex = fields.indexOf(activeKeyboardField.name)

    if (currentIndex === -1 || currentIndex === fields.length - 1) {
      return
    }

    const nextField = fields[currentIndex + 1]
    activateKeyboardField(nextField)
  }

  const handleKeyboardBack = () => {
    if (step <= 1) return

    setActiveKeyboardField(null)
    setStep((current) => (current > 1 ? ((current - 1) as FlowStep) : 1))
  }

  const handleKeyboardContinue = () => {
    if (step === reviewStep) {
      setActiveKeyboardField(null)
      return
    }

    void handleAdvance()
  }

  const handleAdvance = async () => {
    if (step === 1) {
      const valid = await trigger('reason')
      if (valid) {
        setStep(hasSelectionStep ? 2 : ((routingStep ?? personalInfoStep) as FlowStep))
      }
      return
    }

    if (selectionStep !== null && step === selectionStep) {
      const fields: Array<keyof VisitorSelfSigninFormValues> = []

      if (requiresMemberSelection) {
        fields.push('hostMemberId')
      }

      if (requiresEventSelection) {
        fields.push('eventId')
      }

      const valid = fields.length > 0 ? await trigger(fields) : true
      if (valid) {
        setStep((routingStep ?? personalInfoStep) as FlowStep)
      }

      return
    }

    if (routingStep !== null && step === routingStep) {
      const valid = await trigger('branch')
      if (valid) {
        setStep(personalInfoStep)
      }
      return
    }

    if (step === personalInfoStep) {
      const fields: Array<keyof VisitorSelfSigninFormValues> = []

      if (followsMilitaryPath) {
        fields.push('rankPrefix', 'lastName', 'initials', 'unit')
      } else {
        fields.push('firstName', 'lastName')
      }

      const valid = await trigger(fields)
      if (valid) {
        setStep((contractInfoStep ?? reviewStep) as FlowStep)
      }
      return
    }

    if (contractInfoStep !== null && step === contractInfoStep) {
      const valid = await trigger(['organization', 'workDescription'])
      if (valid) {
        setStep(reviewStep)
      }
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!values.reason) return

    setSubmitError(null)

    try {
      const payload = buildReasonFirstVisitorPayload({
        kioskId,
        reason: values.reason,
        branch: values.branch || undefined,
        rankPrefix: values.rankPrefix,
        initials: values.initials,
        firstName: values.firstName,
        lastName: values.lastName,
        unit: values.unit,
        organization: values.organization,
        workDescription: values.workDescription,
        licensePlate: values.licensePlate,
        hostMemberId: values.hostMemberId,
        hostDisplayName: selectedHost?.displayName,
        eventId: values.eventId,
        eventTitle: selectedEvent?.title,
        eventDateLabel: selectedEvent?.eventDateLabel,
      })

      await createVisitor.mutateAsync(payload)

      const completion = getVisitorFinalInstructions({
        visitType: payload.visitType as SelfServiceVisitType,
        visitPurpose: payload.visitPurpose,
        hostDisplayName: selectedHost?.displayName,
      })

      if (isInline) {
        reset(DEFAULT_FORM_VALUES)
        setStep(1)
        setSubmitError(null)
        setMemberSearch('')
        setEventSearch('')
        setSelectedHost(null)
        setSelectedEvent(null)
        setActiveKeyboardField(null)
        onComplete?.(completion)
        return
      }

      setCompletionState(completion)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to complete visitor self sign-in'
      setSubmitError(message)
    }
  })

  const steps = [
    { key: 'reason', label: 'Reason', order: 1 as FlowStep },
    ...(hasSelectionStep
      ? [
          {
            key: 'selection',
            label: requiresEventSelection ? 'Event' : 'Member',
            order: selectionStep as FlowStep,
          },
        ]
      : []),
    ...(routingStep ? [{ key: 'routing', label: 'Routing', order: routingStep }] : []),
    {
      key: 'personal',
      label: 'Personal Info',
      order: personalInfoStep,
    },
    ...(contractInfoStep
      ? [
          {
            key: 'contract',
            label: 'Contract',
            order: contractInfoStep,
          },
        ]
      : []),
    { key: 'review', label: 'Review', order: reviewStep },
  ]

  const reviewReason = reason || 'other'
  const highlightedValueClass = 'text-primary font-semibold'
  const reviewRank = trimValue(rankPrefix)
  const reviewLastName = trimValue(lastName)
  const reviewInitials = trimValue(initials)
  const reviewFirstName = trimValue(firstName)
  const reviewUnit = trimValue(unit)
  const reviewOrganization = trimValue(organization)
  const reviewWorkDescription = trimValue(workDescription)
  const reviewHostName = selectedHost?.displayName
  const reviewEventTitle = selectedEvent?.title
  const reviewEventDate = selectedEvent?.eventDateLabel

  const reviewIdentity = followsMilitaryPath
    ? [reviewRank, reviewLastName, reviewInitials]
        .filter((value): value is string => Boolean(value))
        .join(' ')
    : [reviewFirstName, reviewLastName].filter((value): value is string => Boolean(value)).join(' ')

  const renderDynamicValue = (value: string | undefined, fallback: string): ReactNode => {
    if (!value) return fallback
    return <span className={highlightedValueClass}>{value}</span>
  }

  const reviewIdentityContent = renderDynamicValue(reviewIdentity, 'visitor')
  const reviewUnitClause =
    followsMilitaryPath && reviewUnit ? (
      <>
        {' '}
        from <span className={highlightedValueClass}>{reviewUnit}</span>
      </>
    ) : null
  const reviewMemberClause = reviewHostName ? (
    <>
      {' '}
      with <span className={highlightedValueClass}>{reviewHostName}</span>
    </>
  ) : null
  const reviewEventContent = reviewEventTitle ? (
    <>
      {' '}
      the <span className={highlightedValueClass}>{reviewEventTitle}</span>
      {reviewEventDate ? (
        <>
          {' '}
          (<span className={highlightedValueClass}>{reviewEventDate}</span>)
        </>
      ) : null}{' '}
      event
    </>
  ) : (
    ' an event'
  )
  const reviewOrganizationClause = reviewOrganization ? (
    <>
      {' '}
      with <span className={highlightedValueClass}>{reviewOrganization}</span>
    </>
  ) : null
  const reviewWorkDescriptionClause = reviewWorkDescription ? (
    <>
      {' '}
      to complete <span className={highlightedValueClass}>{reviewWorkDescription}</span>
    </>
  ) : null

  const reviewNarrative: ReactNode = (() => {
    if (reviewReason === 'meeting') {
      return (
        <>
          Welcome {reviewIdentityContent}
          {reviewUnitClause}, you have stated you are here for a meeting
          {reviewMemberClause}.
        </>
      )
    }

    if (reviewReason === 'event') {
      return (
        <>
          Welcome {reviewIdentityContent}
          {reviewUnitClause}, you have stated you are here for
          {reviewEventContent}.
        </>
      )
    }

    if (reviewReason === 'museum') {
      return (
        <>
          Welcome {reviewIdentityContent}
          {reviewUnitClause}, you have stated you are here for a museum visit.
        </>
      )
    }

    if (reviewReason === 'recruitment') {
      return (
        <>Welcome {reviewIdentityContent}, you have stated you are here for recruitment support.</>
      )
    }

    if (reviewReason === 'contract_work') {
      return (
        <>
          Welcome {reviewIdentityContent}
          {reviewUnitClause}, you have stated you are here for contract work
          {reviewOrganizationClause}
          {reviewWorkDescriptionClause}.
        </>
      )
    }

    return (
      <>
        Welcome {reviewIdentityContent}
        {reviewUnitClause}, you have stated you are here for another stated reason.
      </>
    )
  })()

  const activeKeyboardValue = activeKeyboardField
    ? {
        rankPrefix,
        initials,
        firstName,
        lastName,
        unit,
        organization,
        workDescription,
        licensePlate,
        memberSearch,
        eventSearch,
      }[activeKeyboardField.name]
    : ''

  const keyboardVisible =
    ((selectionStep !== null && step === selectionStep) ||
      step === personalInfoStep ||
      (contractInfoStep !== null && step === contractInfoStep) ||
      step === reviewStep) &&
    activeKeyboardField !== null
  const keyboardPreviousLabel = 'Previous'
  const keyboardNextLabel = 'Next'
  const keyboardContinueLabel = step === reviewStep ? 'Close Keyboard' : 'Continue'

  const attachFieldRef =
    (name: KeyboardFieldName, ref: (instance: KeyboardFieldElement | null) => void) =>
    (element: KeyboardFieldElement | null) => {
      ref(element)
      registerFieldRef(name)(element)
    }

  const reasonRegistration = register('reason', { required: 'Select a reason for visiting' })
  const branchRegistration = register('branch', {
    validate: (value) =>
      !requiresBranch || Boolean(value) || 'Select Military or Civilian before continuing',
  })
  const hostMemberRegistration = register('hostMemberId', {
    validate: (value) =>
      !requiresMemberSelection || Boolean(value) || 'Select a member before continuing',
  })
  const eventIdRegistration = register('eventId', {
    validate: (value) =>
      !requiresEventSelection || Boolean(value) || 'Select an event before continuing',
  })

  const rankPrefixRegistration = register('rankPrefix', {
    validate: (value) =>
      !followsMilitaryPath || Boolean(value.trim()) || 'Rank is required for military visitors',
  })
  const initialsRegistration = register('initials', {
    validate: (value) =>
      !followsMilitaryPath ||
      Boolean(value.trim()) ||
      'Initials are required for military visitors',
  })
  const firstNameRegistration = register('firstName', {
    validate: (value) => !followsCivilianPath || Boolean(value.trim()) || 'First name is required',
  })
  const lastNameRegistration = register('lastName', {
    validate: (value) => Boolean(value.trim()) || 'Last name is required',
  })
  const unitRegistration = register('unit', {
    validate: (value) =>
      !followsMilitaryPath || Boolean(value.trim()) || 'Unit is required for military visitors',
  })

  const organizationRegistration = register('organization', {
    validate: (value) =>
      !usesContractInputs ||
      Boolean(value.trim()) ||
      'Company/Organization name is required for contract work',
  })

  const workDescriptionRegistration = register('workDescription', {
    validate: (value) =>
      !usesContractInputs ||
      Boolean(value.trim()) ||
      'Work description is required for contract work',
  })

  const licensePlateRegistration = register('licensePlate')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={isInline ? 'mb-4 rounded-box bg-base-100' : 'mb-3 bg-base-100'}>
        <ul className="kiosk-progress steps w-full steps-horizontal text-xs sm:text-sm">
          {steps.map((item) => (
            <li
              key={item.key}
              className={cn(
                'step',
                (completionState !== null || step >= item.order) && 'step-primary',
                step === item.order && completionState === null && 'font-semibold'
              )}
              data-content={completionState !== null || step > item.order ? '✓' : undefined}
              aria-current={step === item.order && completionState === null ? 'step' : undefined}
            >
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      {completionState ? (
        <div
          className="flex flex-col items-center rounded-box bg-success-fadded px-6 py-8 text-center text-success-fadded-content"
          style={{ gap: 'var(--space-4)' }}
        >
          <CheckCircle2 className="h-16 w-16" />
          <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
            <h3 className="font-display text-3xl">{completionState.title}</h3>
            <p className="text-lg leading-relaxed">{completionState.message}</p>
          </div>
          <div
            className="rounded-box bg-base-100 px-4 py-3 text-base-content"
            style={{ padding: 'var(--space-3) var(--space-4)' }}
          >
            <p className="font-semibold">{completionState.actionLabel}</p>
            <p className="text-sm text-base-content/70">
              This screen will reset for the next visitor in {secondsRemaining}s.
            </p>
          </div>
          <button type="button" className="btn btn-success btn-lg min-w-56" onClick={onCancel}>
            Finish
          </button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <input type="hidden" {...reasonRegistration} />
          <input type="hidden" {...branchRegistration} />
          <input type="hidden" {...hostMemberRegistration} />
          <input type="hidden" {...eventIdRegistration} />

          <div
            className="min-h-0 flex-1 overflow-y-auto pr-1"
            style={{
              padding: isInline
                ? 'var(--space-1) var(--space-2) var(--space-1) var(--space-2)'
                : 'var(--space-1) var(--space-3) var(--space-1) var(--space-2)',
            }}
          >
            {step === 1 && (
              <div className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
                <div
                  className="rounded-box border border-base-300 bg-base-200 px-4 py-3 text-base-content"
                  style={{ padding: 'var(--space-3) var(--space-4)' }}
                >
                  Why are you at the Unit today?
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {SELF_SERVICE_REASON_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        'btn btn-outline h-auto min-h-32 justify-start whitespace-normal border-base-300 bg-base-100 text-left text-base-content',
                        'hover:border-primary hover:bg-base-200',
                        reason === option.value && 'border-primary bg-base-200'
                      )}
                      style={{ padding: 'var(--space-4)' }}
                      onClick={() => handleReasonSelect(option.value)}
                    >
                      <span className="flex flex-col items-start" style={{ gap: 'var(--space-1)' }}>
                        <span className="text-xl font-semibold">{option.label}</span>
                        <span
                          className={`text-sm ${reason === option.value ? 'opacity-90' : 'text-base-content/75'}`}
                        >
                          {option.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>

                {errors.reason && <p className="text-error text-sm">{errors.reason.message}</p>}
              </div>
            )}

            {selectionStep !== null && step === selectionStep && (
              <div className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
                <div
                  className={cn(
                    'grid grid-cols-1 gap-3',
                    requiresEventSelection &&
                      showsMemberSelection &&
                      'xl:grid-cols-2 xl:items-start'
                  )}
                >
                  {requiresEventSelection && (
                    <div
                      className="rounded-box border border-base-300 bg-base-200 px-4 py-4"
                      style={{ padding: 'var(--space-4)' }}
                    >
                      <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
                        <div>
                          <p className="font-semibold">Select Event</p>
                          <p className="text-sm text-base-content/70">
                            Event visits require selecting the event before continuing.
                          </p>
                        </div>

                        {selectedEvent ? (
                          <div
                            className="flex items-center justify-between rounded-box bg-base-100 px-3 py-3"
                            style={{ gap: 'var(--space-2)', padding: 'var(--space-3)' }}
                          >
                            <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                              <CalendarDays className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-semibold">{selectedEvent.title}</p>
                                <p className="text-sm text-base-content/70">
                                  {selectedEvent.eventDateLabel}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={handleClearEvent}
                            >
                              <X className="h-4 w-4" />
                              Clear
                            </button>
                          </div>
                        ) : (
                          <>
                            <label
                              className={cn(
                                'input input-sm w-full border-base-300 bg-base-100',
                                activeKeyboardField?.name === 'eventSearch' && 'border-primary'
                              )}
                            >
                              <span className="label">Event</span>
                              <Search className="h-5 w-5 text-base-content/60" />
                              <input
                                type="text"
                                inputMode="none"
                                autoComplete="off"
                                className="grow bg-transparent text-base-content placeholder:text-base-content/50 focus:outline-none"
                                placeholder="Search event by name"
                                value={eventSearch}
                                ref={registerFieldRef('eventSearch')}
                                onChange={(event) => setEventSearch(event.target.value)}
                                onFocus={() => activateKeyboardField('eventSearch')}
                                onClick={() => activateKeyboardField('eventSearch')}
                              />
                            </label>

                            {eventListQuery.isLoading ? (
                              <p className="text-sm text-base-content/70">Loading events...</p>
                            ) : filteredEvents.length > 0 ? (
                              <div
                                className="flex max-h-72 flex-col overflow-y-auto"
                                style={{ gap: 'var(--space-2)' }}
                              >
                                {filteredEvents.map((event) => (
                                  <button
                                    key={event.id}
                                    type="button"
                                    className="btn btn-outline btn-md h-auto justify-between border-base-300 bg-base-100 px-[var(--space-3)] text-base-content hover:border-primary hover:bg-base-200"
                                    style={{ minHeight: '3.25rem', padding: '0 var(--space-3)' }}
                                    onClick={() => handleSelectEvent(event)}
                                  >
                                    <span className="truncate text-left">
                                      {event.title}
                                      <span className="block text-sm text-base-content/70">
                                        {event.eventDateLabel}
                                      </span>
                                    </span>
                                    <ChevronRight className="h-4 w-4 shrink-0" />
                                  </button>
                                ))}
                              </div>
                            ) : eventListQuery.data && eventListQuery.data.length === 0 ? (
                              <p className="text-sm text-base-content/70">
                                No unit events are currently available. Ask staff for assistance.
                              </p>
                            ) : (
                              <p className="text-sm text-base-content/70">
                                No events matched your search.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {showsMemberSelection && (
                    <div
                      className="rounded-box border border-base-300 bg-base-200 px-4 py-4"
                      style={{ padding: 'var(--space-4)' }}
                    >
                      <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
                        <div>
                          <p className="font-semibold">Select Member</p>
                          <p className="text-sm text-base-content/70">
                            {requiresMemberSelection
                              ? 'Meeting visits require selecting the member you are meeting.'
                              : 'For event visits, selecting a host member is optional.'}
                          </p>
                        </div>

                        {selectedHost ? (
                          <div
                            className="flex items-center justify-between rounded-box bg-base-100 px-3 py-3"
                            style={{ gap: 'var(--space-2)', padding: 'var(--space-3)' }}
                          >
                            <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                              <UserRound className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-semibold">{selectedHost.displayName}</p>
                                <p className="text-sm text-base-content/70">Selected member</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={handleClearHost}
                            >
                              <X className="h-4 w-4" />
                              Clear
                            </button>
                          </div>
                        ) : (
                          <>
                            <label
                              className={cn(
                                'input input-sm w-full border-base-300 bg-base-100',
                                activeKeyboardField?.name === 'memberSearch' && 'border-primary'
                              )}
                            >
                              <span className="label">Member</span>
                              <Search className="h-5 w-5 text-base-content/60" />
                              <input
                                type="text"
                                inputMode="none"
                                autoComplete="off"
                                className="grow bg-transparent text-base-content placeholder:text-base-content/50 focus:outline-none"
                                placeholder="Search member by name"
                                value={memberSearch}
                                ref={registerFieldRef('memberSearch')}
                                onChange={(event) => setMemberSearch(event.target.value)}
                                onFocus={() => activateKeyboardField('memberSearch')}
                                onClick={() => activateKeyboardField('memberSearch')}
                              />
                            </label>

                            {deferredMemberSearch.length < 2 ? (
                              <p className="text-sm text-base-content/70">
                                Enter at least 2 characters to search.
                              </p>
                            ) : memberSearchQuery.isLoading ? (
                              <p className="text-sm text-base-content/70">Searching members...</p>
                            ) : memberSearchQuery.data && memberSearchQuery.data.length > 0 ? (
                              <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
                                {memberSearchQuery.data.map((member) => (
                                  <button
                                    key={member.id}
                                    type="button"
                                    className="btn btn-outline btn-md h-auto justify-between border-base-300 bg-base-100 px-[var(--space-3)] text-base-content hover:border-primary hover:bg-base-200"
                                    style={{ minHeight: '3.25rem', padding: '0 var(--space-3)' }}
                                    onClick={() => handleSelectHost(member)}
                                  >
                                    <span className="truncate">{member.displayName}</span>
                                    <ChevronRight className="h-4 w-4 shrink-0" />
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-base-content/70">
                                No members matched that search.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {errors.hostMemberId && (
                  <p className="text-error text-sm">{errors.hostMemberId.message}</p>
                )}
                {errors.eventId && <p className="text-error text-sm">{errors.eventId.message}</p>}
              </div>
            )}

            {routingStep !== null && step === routingStep && (
              <div className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
                <div
                  className="rounded-box border border-base-300 bg-base-200 px-4 py-3 text-base-content"
                  style={{ padding: 'var(--space-3) var(--space-4)' }}
                >
                  Choose whether this visit should be signed in as military or civilian.
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {SELF_SERVICE_BRANCH_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        'btn btn-outline h-auto min-h-28 justify-start whitespace-normal border-base-300 bg-base-100 text-left text-base-content',
                        'hover:border-primary hover:bg-base-200',
                        branch === option.value && 'border-primary bg-base-200'
                      )}
                      style={{ padding: 'var(--space-4)' }}
                      onClick={() => handleBranchSelect(option.value)}
                    >
                      <span className="flex flex-col items-start" style={{ gap: 'var(--space-1)' }}>
                        <span className="text-xl font-semibold">{option.label}</span>
                        <span
                          className={`text-sm ${branch === option.value ? 'opacity-90' : 'text-base-content/75'}`}
                        >
                          {option.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>

                {errors.branch && <p className="text-error text-sm">{errors.branch.message}</p>}
              </div>
            )}

            {step === personalInfoStep && (
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                {followsMilitaryPath && (
                  <>
                    <fieldset className="fieldset">
                      <label
                        className={cn(
                          'input input-md w-full border-base-300 bg-base-100 text-base-content',
                          Boolean(errors.rankPrefix) && 'input-error',
                          activeKeyboardField?.name === 'rankPrefix' && 'border-primary'
                        )}
                      >
                        <span className="label">Rank</span>
                        <input
                          type="text"
                          inputMode="none"
                          autoComplete="off"
                          value={rankPrefix}
                          className="grow bg-transparent text-base-content placeholder:text-base-content/50 focus:outline-none"
                          placeholder="Rank"
                          {...rankPrefixRegistration}
                          ref={attachFieldRef('rankPrefix', rankPrefixRegistration.ref)}
                          onFocus={() => activateKeyboardField('rankPrefix')}
                          onClick={() => activateKeyboardField('rankPrefix')}
                        />
                      </label>
                      {errors.rankPrefix && (
                        <p className="label text-error">{errors.rankPrefix.message}</p>
                      )}
                    </fieldset>

                    <fieldset className="fieldset">
                      <label
                        className={cn(
                          'input input-md w-full border-base-300 bg-base-100 text-base-content',
                          Boolean(errors.lastName) && 'input-error',
                          activeKeyboardField?.name === 'lastName' && 'border-primary'
                        )}
                      >
                        <span className="label">Last Name</span>
                        <input
                          type="text"
                          inputMode="none"
                          autoComplete="off"
                          value={lastName}
                          className="grow bg-transparent text-base-content placeholder:text-base-content/50 focus:outline-none"
                          placeholder="Last name"
                          {...lastNameRegistration}
                          ref={attachFieldRef('lastName', lastNameRegistration.ref)}
                          onFocus={() => activateKeyboardField('lastName')}
                          onClick={() => activateKeyboardField('lastName')}
                        />
                      </label>
                      {errors.lastName && (
                        <p className="label text-error">{errors.lastName.message}</p>
                      )}
                    </fieldset>

                    <fieldset className="fieldset">
                      <label
                        className={cn(
                          'input input-md w-full border-base-300 bg-base-100 text-base-content',
                          Boolean(errors.initials) && 'input-error',
                          activeKeyboardField?.name === 'initials' && 'border-primary'
                        )}
                      >
                        <span className="label">Initials</span>
                        <input
                          type="text"
                          inputMode="none"
                          autoComplete="off"
                          value={initials}
                          className="grow bg-transparent text-base-content placeholder:text-base-content/50 focus:outline-none"
                          placeholder="Initials"
                          {...initialsRegistration}
                          ref={attachFieldRef('initials', initialsRegistration.ref)}
                          onFocus={() => activateKeyboardField('initials')}
                          onClick={() => activateKeyboardField('initials')}
                        />
                      </label>
                      {errors.initials && (
                        <p className="label text-error">{errors.initials.message}</p>
                      )}
                    </fieldset>

                    <fieldset className="fieldset">
                      <label
                        className={cn(
                          'input input-md w-full border-base-300 bg-base-100 text-base-content',
                          Boolean(errors.unit) && 'input-error',
                          activeKeyboardField?.name === 'unit' && 'border-primary'
                        )}
                      >
                        <span className="label">Unit</span>
                        <input
                          type="text"
                          inputMode="none"
                          autoComplete="off"
                          value={unit}
                          className="grow bg-transparent text-base-content placeholder:text-base-content/50 focus:outline-none"
                          placeholder="Home unit"
                          {...unitRegistration}
                          ref={attachFieldRef('unit', unitRegistration.ref)}
                          onFocus={() => activateKeyboardField('unit')}
                          onClick={() => activateKeyboardField('unit')}
                        />
                      </label>
                      {errors.unit && <p className="label text-error">{errors.unit.message}</p>}
                    </fieldset>
                  </>
                )}

                {followsCivilianPath && (
                  <>
                    <fieldset className="fieldset">
                      <label
                        className={cn(
                          'input input-md w-full border-base-300 bg-base-100 text-base-content',
                          Boolean(errors.firstName) && 'input-error',
                          activeKeyboardField?.name === 'firstName' && 'border-primary'
                        )}
                      >
                        <span className="label">First Name</span>
                        <input
                          type="text"
                          inputMode="none"
                          autoComplete="off"
                          value={firstName}
                          className="grow bg-transparent text-base-content placeholder:text-base-content/50 focus:outline-none"
                          placeholder="First name"
                          {...firstNameRegistration}
                          ref={attachFieldRef('firstName', firstNameRegistration.ref)}
                          onFocus={() => activateKeyboardField('firstName')}
                          onClick={() => activateKeyboardField('firstName')}
                        />
                      </label>
                      {errors.firstName && (
                        <p className="label text-error">{errors.firstName.message}</p>
                      )}
                    </fieldset>

                    <fieldset className="fieldset">
                      <label
                        className={cn(
                          'input input-md w-full border-base-300 bg-base-100 text-base-content',
                          Boolean(errors.lastName) && 'input-error',
                          activeKeyboardField?.name === 'lastName' && 'border-primary'
                        )}
                      >
                        <span className="label">Last Name</span>
                        <input
                          type="text"
                          inputMode="none"
                          autoComplete="off"
                          value={lastName}
                          className="grow bg-transparent text-base-content placeholder:text-base-content/50 focus:outline-none"
                          placeholder="Last name"
                          {...lastNameRegistration}
                          ref={attachFieldRef('lastName', lastNameRegistration.ref)}
                          onFocus={() => activateKeyboardField('lastName')}
                          onClick={() => activateKeyboardField('lastName')}
                        />
                      </label>
                      {errors.lastName && (
                        <p className="label text-error">{errors.lastName.message}</p>
                      )}
                    </fieldset>
                  </>
                )}
              </div>
            )}

            {contractInfoStep !== null && step === contractInfoStep && (
              <div className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
                <div
                  className="rounded-box border border-base-300 bg-base-200 px-4 py-3 text-base-content"
                  style={{ padding: 'var(--space-3) var(--space-4)' }}
                >
                  Enter your contract work details.
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <fieldset className="fieldset">
                    <label
                      className={cn(
                        'input input-md w-full border-base-300 bg-base-100 text-base-content',
                        Boolean(errors.organization) && 'input-error',
                        activeKeyboardField?.name === 'organization' && 'border-primary'
                      )}
                    >
                      <span className="label">Organization</span>
                      <input
                        type="text"
                        inputMode="none"
                        autoComplete="off"
                        value={organization}
                        className="grow bg-transparent text-base-content placeholder:text-base-content/50 focus:outline-none"
                        placeholder="Company or organization name"
                        {...organizationRegistration}
                        ref={attachFieldRef('organization', organizationRegistration.ref)}
                        onFocus={() => activateKeyboardField('organization')}
                        onClick={() => activateKeyboardField('organization')}
                      />
                    </label>
                    {errors.organization && (
                      <p className="label text-error">{errors.organization.message}</p>
                    )}
                  </fieldset>

                  <fieldset className="fieldset">
                    <legend className="fieldset-legend text-sm font-semibold text-base-content">
                      Work Description
                    </legend>
                    <textarea
                      className={cn(
                        'textarea textarea-md min-h-28 w-full border-base-300 bg-base-100 text-base-content',
                        Boolean(errors.workDescription) && 'textarea-error',
                        activeKeyboardField?.name === 'workDescription' && 'border-primary'
                      )}
                      rows={4}
                      inputMode="none"
                      value={workDescription}
                      placeholder="Describe the work you are here to complete"
                      {...workDescriptionRegistration}
                      ref={attachFieldRef('workDescription', workDescriptionRegistration.ref)}
                      onFocus={() => activateKeyboardField('workDescription')}
                      onClick={() => activateKeyboardField('workDescription')}
                    />
                    {errors.workDescription && (
                      <p className="label text-error">{errors.workDescription.message}</p>
                    )}
                  </fieldset>
                </div>
              </div>
            )}

            {step === reviewStep && (
              <div className="rounded-box border border-base-300 bg-base-200 p-3 sm:p-4">
                <div className="flex flex-col gap-3">
                  <div className="rounded-box border border-base-300 bg-base-100 p-3">
                    <p className="text-lg leading-relaxed">{reviewNarrative}</p>
                    <p className="mt-3 text-base leading-relaxed">
                      If you are parked out front or in the back lot please enter your License Plate
                      below and enjoy your visit to HMCS Chippawa.
                    </p>
                  </div>

                  <fieldset className="fieldset">
                    <label
                      className={cn(
                        'input input-md w-full border-base-300 bg-base-100 text-base-content',
                        Boolean(errors.licensePlate) && 'input-error',
                        activeKeyboardField?.name === 'licensePlate' && 'border-primary'
                      )}
                    >
                      <span className="label">License Plate</span>
                      <input
                        type="text"
                        inputMode="none"
                        autoComplete="off"
                        value={licensePlate}
                        className="grow bg-transparent text-base-content placeholder:text-base-content/50 focus:outline-none"
                        placeholder="Optional"
                        {...licensePlateRegistration}
                        ref={attachFieldRef('licensePlate', licensePlateRegistration.ref)}
                        onFocus={() => activateKeyboardField('licensePlate')}
                        onClick={() => activateKeyboardField('licensePlate')}
                      />
                    </label>
                    {errors.licensePlate && (
                      <p className="label text-error">{errors.licensePlate.message}</p>
                    )}
                  </fieldset>
                </div>
              </div>
            )}

            {submitError && (
              <div className="alert alert-error alert-soft mt-4" role="alert">
                <span>{submitError}</span>
              </div>
            )}
          </div>

          {!keyboardVisible && (
            <div
              className={`shrink-0 flex flex-wrap items-center justify-between ${
                isInline ? 'mt-4 gap-2 border-t border-base-300 pt-4' : 'mt-4 gap-2'
              }`}
            >
              <div className="flex gap-2">
                {step > 1 && (
                  <button
                    type="button"
                    className="btn btn-outline btn-md lg:btn-lg"
                    onClick={() =>
                      setStep((current) => (current > 1 ? ((current - 1) as FlowStep) : 1))
                    }
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-outline btn-md lg:btn-lg"
                  onClick={onCancel}
                >
                  Cancel
                </button>
              </div>

              {step < reviewStep ? (
                <button
                  type="button"
                  className="btn btn-primary btn-md min-w-40 lg:btn-lg lg:min-w-48"
                  onClick={() => void handleAdvance()}
                >
                  Continue
                  <ChevronRight className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-md min-w-44 lg:btn-lg lg:min-w-56"
                  disabled={createVisitor.isPending}
                  onClick={() => void onSubmit()}
                >
                  {createVisitor.isPending ? 'Finishing...' : 'Finish Sign-In'}
                </button>
              )}
            </div>
          )}

          {((selectionStep !== null && step === selectionStep) ||
            step === personalInfoStep ||
            (contractInfoStep !== null && step === contractInfoStep) ||
            step === reviewStep) && (
            <div className="mt-4 shrink-0">
              {activeKeyboardField ? (
                <div className="rounded-box bg-base-200">
                  <TouchScreenKeyboard
                    inputName={activeKeyboardField.name}
                    mode={activeKeyboardField.mode}
                    value={activeKeyboardValue}
                    onChange={handleKeyboardValueChange}
                    onPrevious={handleKeyboardPrevious}
                    onNext={handleKeyboardNext}
                    onBack={handleKeyboardBack}
                    onCancel={onCancel}
                    onContinue={handleKeyboardContinue}
                    previousLabel={keyboardPreviousLabel}
                    nextLabel={keyboardNextLabel}
                    continueLabel={keyboardContinueLabel}
                  />
                </div>
              ) : (
                <div className="rounded-b bg-base-200 px-4 py-4 text-base-content/70">
                  Tap one of the text fields above to open the keyboard for that field.
                </div>
              )}
            </div>
          )}
        </form>
      )}
    </div>
  )
}
