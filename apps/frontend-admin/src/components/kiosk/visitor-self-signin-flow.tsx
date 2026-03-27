'use client'

import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import {
  buildVisitorReasonSummary,
  getRecruitmentStepLabel,
  getSelfServiceVisitTypeLabel,
  getVisitPurposeLabel,
  getVisitorFinalInstructions,
  RECRUITMENT_STEP_OPTIONS,
  SELF_SERVICE_VISIT_TYPE_OPTIONS,
  type SelfServiceVisitType,
  VISIT_PURPOSE_OPTIONS,
} from '@/lib/visitor-self-signin'
import { useCreateVisitor } from '@/hooks/use-visitors'
import {
  TouchScreenKeyboard,
  type TouchKeyboardMode,
} from '@/components/kiosk/touch-screen-keyboard'
import type { CreateVisitorInput, RecruitmentStep, VisitPurpose } from '@sentinel/contracts'
import { CheckCircle2, ChevronRight, Phone, Search, ShieldCheck, UserRound, X } from 'lucide-react'

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

type KeyboardFieldName =
  | 'rankPrefix'
  | 'unit'
  | 'organization'
  | 'firstName'
  | 'lastName'
  | 'mobilePhone'
  | 'hostSearch'
  | 'purposeDetails'

interface ActiveKeyboardField {
  name: KeyboardFieldName
  mode: TouchKeyboardMode
}

interface VisitorSelfSigninFormValues {
  visitType: SelfServiceVisitType | ''
  rankPrefix: string
  firstName: string
  lastName: string
  unit: string
  organization: string
  mobilePhone: string
  recruitmentStep: RecruitmentStep | ''
  visitPurpose: VisitPurpose | ''
  hostMemberId: string
  purposeDetails: string
}

const DEFAULT_FORM_VALUES: VisitorSelfSigninFormValues = {
  visitType: '',
  rankPrefix: '',
  firstName: '',
  lastName: '',
  unit: '',
  organization: '',
  mobilePhone: '',
  recruitmentStep: '',
  visitPurpose: '',
  hostMemberId: '',
  purposeDetails: '',
}

type KeyboardFieldElement = globalThis.HTMLInputElement | globalThis.HTMLTextAreaElement

function trimValue(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function VisitorSelfSigninFlow({
  kioskId,
  layout = 'modal',
  onCancel,
  onComplete,
}: VisitorSelfSigninFlowProps) {
  const fieldRefs = useRef<Partial<Record<KeyboardFieldName, KeyboardFieldElement | null>>>({})
  const previousStepRef = useRef<1 | 2 | 3 | 4>(1)
  const createVisitor = useCreateVisitor()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [hostSearch, setHostSearch] = useState('')
  const [selectedHost, setSelectedHost] = useState<HostOption | null>(null)
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

  const visitType = useWatch({ control, name: 'visitType' })
  const visitPurpose = useWatch({ control, name: 'visitPurpose' })
  const recruitmentStep = useWatch({ control, name: 'recruitmentStep' })
  const firstName = useWatch({ control, name: 'firstName' })
  const lastName = useWatch({ control, name: 'lastName' })
  const rankPrefix = useWatch({ control, name: 'rankPrefix' })
  const unit = useWatch({ control, name: 'unit' })
  const organization = useWatch({ control, name: 'organization' })
  const mobilePhone = useWatch({ control, name: 'mobilePhone' })
  const purposeDetails = useWatch({ control, name: 'purposeDetails' })

  const hostSearchEnabled = visitPurpose === 'member_invited' || visitPurpose === 'appointment'
  const deferredHostSearch = useDeferredValue(hostSearch.trim())
  const isInline = layout === 'inline'

  const memberSearchQuery = useQuery({
    queryKey: ['kiosk-visitor-host-search', deferredHostSearch],
    enabled: hostSearchEnabled && deferredHostSearch.length >= 2,
    queryFn: async () => {
      const response = await apiClient.members.getMembers({
        query: {
          page: '1',
          limit: '8',
          search: deferredHostSearch,
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
    if (hostSearchEnabled) return

    setHostSearch('')
    setSelectedHost(null)
    setValue('hostMemberId', '')
    clearErrors('purposeDetails')
  }, [clearErrors, hostSearchEnabled, setValue])

  useEffect(() => {
    if (completionState) {
      setActiveKeyboardField(null)
      return
    }

    if (!activeKeyboardField) return

    const visibleFields = new Set<KeyboardFieldName>()

    if (step === 2) {
      visibleFields.add('firstName')
      visibleFields.add('lastName')
      visibleFields.add('mobilePhone')

      if (visitType === 'military') {
        visibleFields.add('rankPrefix')
        visibleFields.add('unit')
      }

      if (visitType === 'contractor') {
        visibleFields.add('organization')
      }
    }

    if (step === 3) {
      visibleFields.add('purposeDetails')

      if (hostSearchEnabled && !selectedHost) {
        visibleFields.add('hostSearch')
      }
    }

    if (!visibleFields.has(activeKeyboardField.name)) {
      setActiveKeyboardField(null)
    }
  }, [activeKeyboardField, completionState, hostSearchEnabled, selectedHost, step, visitType])

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

    if (step === 2) {
      const firstField =
        visitType === 'military'
          ? 'rankPrefix'
          : visitType === 'contractor'
            ? 'organization'
            : 'firstName'

      activateStepField(firstField, 'keyboard')
      return
    }

    if (step === 3) {
      const firstField = hostSearchEnabled && !selectedHost ? 'hostSearch' : 'purposeDetails'

      activateStepField(firstField)
    }
  }, [activeKeyboardField, completionState, hostSearchEnabled, selectedHost, step, visitType])

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

  const handleTypeSelect = (value: SelfServiceVisitType) => {
    setValue('visitType', value, { shouldValidate: true })
    clearErrors('visitType')

    if (value === 'contractor') {
      setValue('visitPurpose', 'other', { shouldValidate: true })
      clearErrors('visitPurpose')
      return
    }

    if (visitType === 'contractor') {
      setValue('visitPurpose', '')
      setValue('hostMemberId', '')
      setHostSearch('')
      setSelectedHost(null)
      clearErrors('visitPurpose')
      clearErrors('purposeDetails')
    }
  }

  const handlePurposeSelect = (value: VisitPurpose) => {
    setValue('visitPurpose', value, { shouldValidate: true })
    clearErrors('visitPurpose')
    clearErrors('purposeDetails')
  }

  const handleSelectHost = (host: HostOption) => {
    setSelectedHost(host)
    setHostSearch('')
    setValue('hostMemberId', host.id, { shouldValidate: true })
    clearErrors('purposeDetails')
  }

  const handleClearHost = () => {
    setSelectedHost(null)
    setValue('hostMemberId', '')
  }

  const getKeyboardFieldOrder = (): KeyboardFieldName[] => {
    if (step === 2) {
      const fields: KeyboardFieldName[] = []

      if (visitType === 'military') {
        fields.push('rankPrefix', 'unit')
      }

      if (visitType === 'contractor') {
        fields.push('organization')
      }

      fields.push('firstName', 'lastName', 'mobilePhone')
      return fields
    }

    if (step === 3) {
      const fields: KeyboardFieldName[] = []

      if (hostSearchEnabled && !selectedHost) {
        fields.push('hostSearch')
      }

      fields.push('purposeDetails')
      return fields
    }

    return []
  }

  const handleKeyboardValueChange = (value: string) => {
    if (!activeKeyboardField) return

    if (activeKeyboardField.name === 'hostSearch') {
      setHostSearch(value)
      focusKeyboardField('hostSearch', value.length)

      return
    }

    const fieldName = activeKeyboardField.name as Exclude<KeyboardFieldName, 'hostSearch'>

    setValue(fieldName, value, {
      shouldDirty: true,
      shouldTouch: true,
    })
    clearErrors(fieldName)
    focusKeyboardField(fieldName, value.length)
  }

  const handleKeyboardEnter = () => {
    if (window.document.activeElement instanceof HTMLElement) {
      window.document.activeElement.blur()
    }

    setActiveKeyboardField(null)
  }

  const handleKeyboardNext = () => {
    if (!activeKeyboardField) return

    const fields = getKeyboardFieldOrder()
    const currentIndex = fields.indexOf(activeKeyboardField.name)

    if (currentIndex === -1 || currentIndex === fields.length - 1) {
      handleKeyboardEnter()
      return
    }

    const nextField = fields[currentIndex + 1]
    const nextMode: TouchKeyboardMode = nextField === 'mobilePhone' ? 'numpad' : 'keyboard'
    activateKeyboardField(nextField, nextMode)
  }

  const handleAdvance = async () => {
    if (step === 1) {
      const valid = await trigger('visitType')
      if (valid) setStep(2)
      return
    }

    if (step === 2) {
      const fields: Array<keyof VisitorSelfSigninFormValues> = [
        'firstName',
        'lastName',
        'mobilePhone',
      ]

      if (visitType === 'military') {
        fields.push('rankPrefix', 'unit')
      }
      if (visitType === 'contractor') {
        fields.push('organization')
      }
      if (visitType === 'recruitment') {
        fields.push('recruitmentStep')
      }

      const valid = await trigger(fields)
      if (valid) setStep(3)
      return
    }

    if (step === 3) {
      const fields: Array<keyof VisitorSelfSigninFormValues> =
        visitType === 'contractor' ? ['purposeDetails'] : ['visitPurpose', 'purposeDetails']
      const valid = await trigger(fields)
      if (valid) setStep(4)
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!values.visitType || !values.visitPurpose) return

    setSubmitError(null)

    try {
      const payload: CreateVisitorInput = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        name: [trimValue(values.rankPrefix), values.firstName.trim(), values.lastName.trim()]
          .filter(Boolean)
          .join(' '),
        visitType: values.visitType,
        mobilePhone: values.mobilePhone.trim(),
        kioskId,
        checkInMethod: 'kiosk_self_service',
        visitPurpose: values.visitPurpose,
      }

      if (visitType === 'military') {
        payload.rankPrefix = values.rankPrefix.trim()
        payload.unit = values.unit.trim()
      }

      if (visitType === 'contractor') {
        payload.organization = values.organization.trim()
      }

      if (visitType === 'recruitment' && values.recruitmentStep) {
        payload.recruitmentStep = values.recruitmentStep
      }

      if (values.hostMemberId) {
        payload.hostMemberId = values.hostMemberId
      }

      const trimmedPurposeDetails = trimValue(values.purposeDetails)
      if (trimmedPurposeDetails) {
        payload.purposeDetails = trimmedPurposeDetails
      }

      payload.visitReason = buildVisitorReasonSummary({
        visitType: values.visitType,
        visitPurpose: values.visitPurpose,
        recruitmentStep: values.recruitmentStep || undefined,
        organization: trimValue(values.organization),
        unit: trimValue(values.unit),
        hostDisplayName: selectedHost?.displayName,
        purposeDetails: trimmedPurposeDetails,
      })

      await createVisitor.mutateAsync(payload)

      const completion = getVisitorFinalInstructions({
        visitType: values.visitType,
        visitPurpose: values.visitPurpose,
        hostDisplayName: selectedHost?.displayName,
      })

      if (isInline) {
        reset(DEFAULT_FORM_VALUES)
        setStep(1)
        setSubmitError(null)
        setHostSearch('')
        setSelectedHost(null)
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
    { label: 'Visitor Type', active: step >= 1 || completionState !== null },
    { label: 'Details', active: step >= 2 || completionState !== null },
    { label: 'Visit Purpose', active: step >= 3 || completionState !== null },
    { label: 'Review', active: step >= 4 || completionState !== null },
  ]

  const reviewVisitType = visitType || 'guest'
  const reviewPurpose = visitPurpose || 'information'
  const activeKeyboardValue = activeKeyboardField
    ? {
        rankPrefix,
        unit,
        organization,
        firstName,
        lastName,
        mobilePhone,
        hostSearch,
        purposeDetails,
      }[activeKeyboardField.name]
    : ''
  const keyboardVisible = (step === 2 || step === 3) && activeKeyboardField !== null
  const keyboardFieldOrder = getKeyboardFieldOrder()
  const activeKeyboardIndex = activeKeyboardField
    ? keyboardFieldOrder.indexOf(activeKeyboardField.name)
    : -1
  const keyboardNextLabel =
    activeKeyboardIndex >= 0 && activeKeyboardIndex < keyboardFieldOrder.length - 1
      ? 'Next'
      : 'Done'

  const attachFieldRef =
    (name: KeyboardFieldName, ref: (instance: KeyboardFieldElement | null) => void) =>
    (element: KeyboardFieldElement | null) => {
      ref(element)
      registerFieldRef(name)(element)
    }

  const rankPrefixRegistration = register('rankPrefix', {
    validate: (value) =>
      visitType !== 'military' || Boolean(value.trim()) || 'Rank is required for military visitors',
  })
  const unitRegistration = register('unit', {
    validate: (value) =>
      visitType !== 'military' || Boolean(value.trim()) || 'Unit is required for military visitors',
  })
  const organizationRegistration = register('organization', {
    validate: (value) =>
      visitType !== 'contractor' ||
      Boolean(value.trim()) ||
      'Company name is required for contractors',
  })
  const firstNameRegistration = register('firstName', {
    required: 'First name is required',
    validate: (value) => Boolean(value.trim()) || 'First name is required',
  })
  const lastNameRegistration = register('lastName', {
    required: 'Last name is required',
    validate: (value) => Boolean(value.trim()) || 'Last name is required',
  })
  const mobilePhoneRegistration = register('mobilePhone', {
    required: 'Mobile phone is required',
    validate: (value) => Boolean(value.trim()) || 'Mobile phone is required',
  })
  const purposeDetailsRegistration = register('purposeDetails', {
    validate: (value) => {
      const trimmed = value.trim()
      if (visitType === 'contractor') {
        return Boolean(trimmed) || 'Describe the work the contractor is here to complete'
      }

      if (visitPurpose === 'other') {
        return Boolean(trimmed) || 'Please describe the reason for your visit'
      }

      if (hostSearchEnabled && !selectedHost && !trimmed) {
        return 'Select a host member or enter fallback details'
      }

      return true
    },
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={isInline ? 'mb-4 rounded-box bg-base-100' : 'mb-3 bg-base-100'}>
        <ul className="steps steps-vertical lg:steps-horizontal w-full">
          {steps.map((item) => (
            <li key={item.label} className={`step ${item.active ? 'step-primary' : ''} text-sm`}>
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
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" {...register('visitType', { required: 'Select a visitor type' })} />
          <input
            type="hidden"
            {...register('visitPurpose', { required: 'Select a visit purpose' })}
          />
          <input type="hidden" {...register('hostMemberId')} />

          <div
            className="min-h-0 flex-1 overflow-y-auto pr-1"
            style={{
              padding: isInline
                ? 'var(--space-1) var(--space-2) var(--space-1) 0'
                : 'var(--space-1) var(--space-3) var(--space-1) var(--space-1)',
            }}
          >
            {step === 1 && (
              <div className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
                <div
                  className="rounded-box bg-info-fadded px-4 py-3 text-info-fadded-content"
                  style={{ padding: 'var(--space-3) var(--space-4)' }}
                >
                  Choose the option that best matches why you are signing into the Unit today.
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {SELF_SERVICE_VISIT_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`btn h-auto min-h-32 justify-start text-left whitespace-normal ${
                        visitType === option.value ? 'btn-primary' : 'btn-outline'
                      }`}
                      style={{ padding: 'var(--space-4)' }}
                      onClick={() => handleTypeSelect(option.value)}
                    >
                      <span className="flex flex-col items-start" style={{ gap: 'var(--space-1)' }}>
                        <span className="text-xl font-semibold">{option.label}</span>
                        <span className="text-sm opacity-80">{option.description}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {errors.visitType && (
                  <p className="text-error text-sm">{errors.visitType.message}</p>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {visitType === 'military' && (
                  <>
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">Rank</legend>
                      <input
                        type="text"
                        inputMode="none"
                        autoComplete="off"
                        value={rankPrefix}
                        className={`input input-md w-full ${errors.rankPrefix ? 'input-error' : ''} ${
                          activeKeyboardField?.name === 'rankPrefix' ? 'ring-2 ring-primary/25' : ''
                        }`}
                        placeholder="Rank or prefix"
                        {...rankPrefixRegistration}
                        ref={attachFieldRef('rankPrefix', rankPrefixRegistration.ref)}
                        onFocus={() => activateKeyboardField('rankPrefix')}
                        onClick={() => activateKeyboardField('rankPrefix')}
                      />
                      {errors.rankPrefix && (
                        <p className="label text-error">{errors.rankPrefix.message}</p>
                      )}
                    </fieldset>

                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">Unit</legend>
                      <input
                        type="text"
                        inputMode="none"
                        autoComplete="off"
                        value={unit}
                        className={`input input-md w-full ${errors.unit ? 'input-error' : ''} ${
                          activeKeyboardField?.name === 'unit' ? 'ring-2 ring-primary/25' : ''
                        }`}
                        placeholder="Your home unit"
                        {...unitRegistration}
                        ref={attachFieldRef('unit', unitRegistration.ref)}
                        onFocus={() => activateKeyboardField('unit')}
                        onClick={() => activateKeyboardField('unit')}
                      />
                      {errors.unit && <p className="label text-error">{errors.unit.message}</p>}
                    </fieldset>
                  </>
                )}

                {visitType === 'contractor' && (
                  <fieldset className="fieldset lg:col-span-2">
                    <legend className="fieldset-legend">Company Name</legend>
                    <input
                      type="text"
                      inputMode="none"
                      autoComplete="off"
                      value={organization}
                      className={`input input-md w-full ${errors.organization ? 'input-error' : ''} ${
                        activeKeyboardField?.name === 'organization' ? 'ring-2 ring-primary/25' : ''
                      }`}
                      placeholder="Company or contractor name"
                      {...organizationRegistration}
                      ref={attachFieldRef('organization', organizationRegistration.ref)}
                      onFocus={() => activateKeyboardField('organization')}
                      onClick={() => activateKeyboardField('organization')}
                    />
                    {errors.organization && (
                      <p className="label text-error">{errors.organization.message}</p>
                    )}
                  </fieldset>
                )}

                {visitType === 'recruitment' && (
                  <fieldset className="fieldset lg:col-span-2">
                    <legend className="fieldset-legend">Recruitment Step</legend>
                    <select
                      className={`select select-md w-full ${
                        errors.recruitmentStep ? 'select-error' : ''
                      }`}
                      {...register('recruitmentStep', {
                        validate: (value) =>
                          visitType !== 'recruitment' ||
                          Boolean(value) ||
                          'Select the recruitment step for this visit',
                      })}
                    >
                      <option value="">Choose the recruitment step</option>
                      {RECRUITMENT_STEP_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.recruitmentStep && (
                      <p className="label text-error">{errors.recruitmentStep.message}</p>
                    )}
                  </fieldset>
                )}

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">First Name</legend>
                  <input
                    type="text"
                    inputMode="none"
                    autoComplete="off"
                    value={firstName}
                    className={`input input-md w-full ${errors.firstName ? 'input-error' : ''} ${
                      activeKeyboardField?.name === 'firstName' ? 'ring-2 ring-primary/25' : ''
                    }`}
                    placeholder="First name"
                    {...firstNameRegistration}
                    ref={attachFieldRef('firstName', firstNameRegistration.ref)}
                    onFocus={() => activateKeyboardField('firstName')}
                    onClick={() => activateKeyboardField('firstName')}
                  />
                  {errors.firstName && (
                    <p className="label text-error">{errors.firstName.message}</p>
                  )}
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Last Name</legend>
                  <input
                    type="text"
                    inputMode="none"
                    autoComplete="off"
                    value={lastName}
                    className={`input input-md w-full ${errors.lastName ? 'input-error' : ''} ${
                      activeKeyboardField?.name === 'lastName' ? 'ring-2 ring-primary/25' : ''
                    }`}
                    placeholder="Last name"
                    {...lastNameRegistration}
                    ref={attachFieldRef('lastName', lastNameRegistration.ref)}
                    onFocus={() => activateKeyboardField('lastName')}
                    onClick={() => activateKeyboardField('lastName')}
                  />
                  {errors.lastName && <p className="label text-error">{errors.lastName.message}</p>}
                </fieldset>

                <fieldset className="fieldset lg:col-span-2">
                  <legend className="fieldset-legend">Mobile Phone Number</legend>
                  <label
                    className={`input input-md w-full ${errors.mobilePhone ? 'input-error' : ''} ${
                      activeKeyboardField?.name === 'mobilePhone' ? 'ring-2 ring-primary/25' : ''
                    }`}
                  >
                    <Phone className="h-5 w-5 text-base-content/60" />
                    <input
                      type="tel"
                      inputMode="none"
                      autoComplete="off"
                      value={mobilePhone}
                      placeholder="Used only in case of an emergency"
                      {...mobilePhoneRegistration}
                      ref={attachFieldRef('mobilePhone', mobilePhoneRegistration.ref)}
                      onFocus={() => activateKeyboardField('mobilePhone', 'numpad')}
                      onClick={() => activateKeyboardField('mobilePhone', 'numpad')}
                    />
                  </label>
                  <p className="label text-base-content/70">
                    This number is used only in case of an emergency while you are in the Unit.
                  </p>
                  {errors.mobilePhone && (
                    <p className="label text-error">{errors.mobilePhone.message}</p>
                  )}
                </fieldset>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
                {visitType === 'contractor' ? (
                  <div
                    className="rounded-box bg-info-fadded px-4 py-3 text-info-fadded-content"
                    style={{ padding: 'var(--space-3) var(--space-4)' }}
                  >
                    Tell us what work you are here to complete today so Unit staff can direct you
                    appropriately.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {VISIT_PURPOSE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`btn h-auto min-h-28 justify-start text-left whitespace-normal ${
                            visitPurpose === option.value ? 'btn-primary' : 'btn-outline'
                          }`}
                          style={{ padding: 'var(--space-4)' }}
                          onClick={() => handlePurposeSelect(option.value)}
                        >
                          <span
                            className="flex flex-col items-start"
                            style={{ gap: 'var(--space-1)' }}
                          >
                            <span className="text-lg font-semibold">{option.label}</span>
                            <span className="text-sm opacity-80">{option.description}</span>
                          </span>
                        </button>
                      ))}
                    </div>

                    {errors.visitPurpose && (
                      <p className="text-error text-sm">{errors.visitPurpose.message}</p>
                    )}
                  </>
                )}

                {hostSearchEnabled && (
                  <div
                    className="rounded-box border border-base-300 bg-base-200 px-4 py-4"
                    style={{ padding: 'var(--space-4)' }}
                  >
                    <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
                      <div>
                        <p className="font-semibold">Search for the member you are visiting</p>
                        <p className="text-sm text-base-content/70">
                          If you cannot find them, enter fallback details below so staff can assist
                          you.
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
                              <p className="text-sm text-base-content/70">Selected host member</p>
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
                            className={`input input-md w-full ${
                              activeKeyboardField?.name === 'hostSearch'
                                ? 'ring-2 ring-primary/25'
                                : ''
                            }`}
                          >
                            <Search className="h-5 w-5 text-base-content/60" />
                            <input
                              type="text"
                              inputMode="none"
                              autoComplete="off"
                              placeholder="Search by member name"
                              value={hostSearch}
                              ref={registerFieldRef('hostSearch')}
                              onChange={(event) => setHostSearch(event.target.value)}
                              onFocus={() => activateKeyboardField('hostSearch')}
                              onClick={() => activateKeyboardField('hostSearch')}
                            />
                          </label>

                          {deferredHostSearch.length < 2 ? (
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
                                  className="btn btn-outline justify-between"
                                  style={{ minHeight: '3.5rem', padding: '0 var(--space-4)' }}
                                  onClick={() => handleSelectHost(member)}
                                >
                                  <span className="truncate">{member.displayName}</span>
                                  <ChevronRight className="h-4 w-4 shrink-0" />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-base-content/70">
                              No members matched that search. Enter fallback details below.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">
                    {visitType === 'contractor'
                      ? 'Work Details'
                      : visitPurpose === 'other'
                        ? 'Visit Details'
                        : hostSearchEnabled
                          ? 'Fallback Details'
                          : 'Additional Details'}
                  </legend>
                  <textarea
                    className={`textarea textarea-md w-full ${
                      errors.purposeDetails ? 'textarea-error' : ''
                    } ${activeKeyboardField?.name === 'purposeDetails' ? 'ring-2 ring-primary/25' : ''}`}
                    rows={4}
                    inputMode="none"
                    value={purposeDetails}
                    placeholder={
                      visitType === 'contractor'
                        ? 'Describe the work, repair, delivery, or service you are here to complete'
                        : visitPurpose === 'other'
                          ? 'Describe why you are visiting the Unit'
                          : hostSearchEnabled
                            ? 'If you cannot find the member, enter the person or office you are trying to reach'
                            : 'Optional details for staff'
                    }
                    {...purposeDetailsRegistration}
                    ref={attachFieldRef('purposeDetails', purposeDetailsRegistration.ref)}
                    onFocus={() => activateKeyboardField('purposeDetails')}
                    onClick={() => activateKeyboardField('purposeDetails')}
                  />
                  {errors.purposeDetails && (
                    <p className="label text-error">{errors.purposeDetails.message}</p>
                  )}
                </fieldset>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
                <div
                  className="grid grid-cols-1 gap-3 rounded-box bg-base-200 p-4 lg:grid-cols-2"
                  style={{ gap: 'var(--space-3)', padding: 'var(--space-4)' }}
                >
                  <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
                    <div
                      className="flex items-center justify-between"
                      style={{ gap: 'var(--space-2)' }}
                    >
                      <p className="font-semibold">Visitor Type</p>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setStep(1)}
                      >
                        Change
                      </button>
                    </div>
                    <p>{getSelfServiceVisitTypeLabel(reviewVisitType)}</p>
                    {reviewVisitType === 'recruitment' && recruitmentStep && (
                      <p className="text-sm text-base-content/70">
                        Step: {getRecruitmentStepLabel(recruitmentStep)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
                    <div
                      className="flex items-center justify-between"
                      style={{ gap: 'var(--space-2)' }}
                    >
                      <p className="font-semibold">Visitor Details</p>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setStep(2)}
                      >
                        Change
                      </button>
                    </div>
                    <p>{[trimValue(rankPrefix), firstName, lastName].filter(Boolean).join(' ')}</p>
                    {reviewVisitType === 'military' && unit && (
                      <p className="text-sm text-base-content/70">Unit: {unit}</p>
                    )}
                    {reviewVisitType === 'contractor' && organization && (
                      <p className="text-sm text-base-content/70">Company: {organization}</p>
                    )}
                    <p className="text-sm text-base-content/70">Mobile: {mobilePhone}</p>
                  </div>

                  <div className="flex flex-col lg:col-span-2" style={{ gap: 'var(--space-2)' }}>
                    <div
                      className="flex items-center justify-between"
                      style={{ gap: 'var(--space-2)' }}
                    >
                      <p className="font-semibold">Visit Purpose</p>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setStep(3)}
                      >
                        Change
                      </button>
                    </div>
                    <p>
                      {reviewVisitType === 'contractor'
                        ? 'Contract work'
                        : getVisitPurposeLabel(reviewPurpose)}
                    </p>
                    {selectedHost && (
                      <p className="text-sm text-base-content/70">
                        Host: {selectedHost.displayName}
                      </p>
                    )}
                    {purposeDetails && (
                      <p className="text-sm text-base-content/70">Details: {purposeDetails}</p>
                    )}
                  </div>
                </div>

                <div
                  className="rounded-box bg-success-fadded px-4 py-3 text-success-fadded-content"
                  style={{ padding: 'var(--space-3) var(--space-4)' }}
                >
                  <div className="flex items-start" style={{ gap: 'var(--space-2)' }}>
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>
                      Review your information carefully. When you finish, the kiosk will show where
                      you need to report next.
                    </p>
                  </div>
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
                    onClick={() => setStep((current) => (current - 1) as 1 | 2 | 3 | 4)}
                  >
                    Back
                  </button>
                )}
                <button type="button" className="btn btn-ghost btn-md lg:btn-lg" onClick={onCancel}>
                  Cancel
                </button>
              </div>

              {step < 4 ? (
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
                  type="submit"
                  className="btn btn-primary btn-md min-w-44 lg:btn-lg lg:min-w-56"
                  disabled={createVisitor.isPending}
                >
                  {createVisitor.isPending ? 'Finishing...' : 'Finish Sign-In'}
                </button>
              )}
            </div>
          )}

          {(step === 2 || step === 3) && (
            <div className="mt-4 shrink-0">
              {activeKeyboardField ? (
                <div className="rounded-box bg-base-200">
                  <TouchScreenKeyboard
                    inputName={activeKeyboardField.name}
                    mode={activeKeyboardField.mode}
                    value={activeKeyboardValue}
                    onChange={handleKeyboardValueChange}
                    onEnter={handleKeyboardEnter}
                    onNext={handleKeyboardNext}
                    nextLabel={keyboardNextLabel}
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
