'use client'

/* global HTMLInputElement */

import { useRef, useEffect, useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import type { RemoteSystemOption } from '@sentinel/contracts'
import { KeyRound, ArrowLeft, LoaderCircle, LogIn } from 'lucide-react'
import { TID } from '@/lib/test-ids'

export interface PinInputSubmission {
  pin: string
  remoteSystemId?: string
  useKioskRemoteSystem?: boolean
}

export interface PinInputInitialSelection {
  id: string
}

interface PinInputProps {
  onSubmit: (input: PinInputSubmission) => void
  onBack: () => void
  loading?: boolean
  remoteSystems: RemoteSystemOption[]
  remoteSystemsLoading?: boolean
  remoteSystemsError?: string | null
  initialSelection?: PinInputInitialSelection | null
  forceKioskRemoteSystem?: boolean
}

export function PinInput({
  onSubmit,
  onBack,
  loading = false,
  remoteSystems,
  remoteSystemsLoading = false,
  remoteSystemsError = null,
  initialSelection = null,
  forceKioskRemoteSystem = false,
}: PinInputProps) {
  const [pin, setPin] = useState('')
  const [selectedRemoteSystem, setSelectedRemoteSystem] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const defaultRemoteSystemId = useMemo(() => {
    if (initialSelection && remoteSystems.some((system) => system.id === initialSelection.id)) {
      return initialSelection.id
    }

    const deploymentSystem = remoteSystems.find((system) => system.code === 'deployment_laptop')
    if (deploymentSystem) {
      return deploymentSystem.id
    }

    return remoteSystems[0]?.id ?? ''
  }, [initialSelection, remoteSystems])

  const effectiveSelectedRemoteSystem = selectedRemoteSystem || defaultRemoteSystemId
  const kioskRemoteSystem = remoteSystems.find((system) => system.code === 'kiosk')
  const remoteSystemDescription =
    remoteSystems.find((system) => system.id === effectiveSelectedRemoteSystem)?.description ?? null
  const hasSelectableRemoteSystems = remoteSystems.length > 0
  const canSubmit =
    pin.length === 4 &&
    (forceKioskRemoteSystem
      ? Boolean(kioskRemoteSystem) && !remoteSystemsLoading
      : effectiveSelectedRemoteSystem.length > 0)

  const handleSubmit = () => {
    if (!canSubmit) {
      return
    }

    if (forceKioskRemoteSystem) {
      onSubmit({
        pin,
        useKioskRemoteSystem: true,
      })
      return
    }

    onSubmit({
      pin,
      remoteSystemId: effectiveSelectedRemoteSystem,
    })
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(value)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && canSubmit) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onBack()
    }
  }

  return (
    <fieldset className="fieldset space-y-(--space-4)">
      <legend className="fieldset-legend mx-auto text-center text-2xl font-semibold">
        Enter your 4-digit PIN
      </legend>
      <div className="flex justify-center">
        <div className="rounded-full bg-primary-fadded p-(--space-3) text-primary-fadded-content">
          <KeyRound size={36} strokeWidth={1.75} />
        </div>
      </div>

      {remoteSystemsError && (
        <div role="alert" className="alert alert-warning alert-soft">
          <span>{remoteSystemsError}</span>
        </div>
      )}

      {forceKioskRemoteSystem ? (
        <fieldset
          className="rounded-box border border-base-300 bg-base-200/70 px-(--space-3) py-(--space-2)"
          data-testid={TID.auth.remoteSystemSelect}
        >
          <legend className="text-xs font-semibold uppercase tracking-[0.1em] text-base-content/60">
            Remote System
          </legend>
          <p className="text-sm font-semibold text-base-content">
            Kiosk <span className="font-normal text-base-content/65">(automatic)</span>
          </p>
          {remoteSystemsLoading && (
            <p className="label mt-(--space-1) text-base-content/60">
              Loading managed remote systems...
            </p>
          )}
          {!remoteSystemsLoading && !kioskRemoteSystem && (
            <p className="label mt-(--space-1) text-error">
              Kiosk remote system is not configured. Ask an admin to add an active `kiosk` station
              in Settings.
            </p>
          )}
        </fieldset>
      ) : (
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Remote system</legend>
          <select
            className="select w-full"
            value={effectiveSelectedRemoteSystem}
            onChange={(event) => setSelectedRemoteSystem(event.target.value)}
            disabled={loading}
            data-testid={TID.auth.remoteSystemSelect}
          >
            <option value="" disabled>
              Select a remote system
            </option>
            {remoteSystems.map((system) => (
              <option key={system.id} value={system.id}>
                {system.name}
              </option>
            ))}
          </select>
          <p className="label">
            Required so Sentinel can track which managed station is connected.
          </p>
          {remoteSystemsLoading && (
            <p className="label text-base-content/60">Loading managed remote systems...</p>
          )}
          {!remoteSystemsLoading && !hasSelectableRemoteSystems && !remoteSystemsError && (
            <p className="label text-error">
              No active remote systems are configured. Ask an admin to add one in Settings.
            </p>
          )}
          {remoteSystemDescription && (
            <p className="label text-base-content/60">{remoteSystemDescription}</p>
          )}
        </fieldset>
      )}

      <fieldset className="fieldset">
        <legend className="fieldset-legend">PIN</legend>
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          className="input input-lg w-full text-center font-mono text-2xl tracking-[0.45em]"
          placeholder="- - - -"
          value={pin}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          maxLength={4}
          disabled={loading}
          aria-label="PIN"
          autoComplete="off"
          data-testid={TID.auth.pinInput}
        />
      </fieldset>

      <div className="grid grid-cols-2 gap-(--space-2)">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onBack}
          disabled={loading}
          data-testid={TID.auth.pinBack}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          data-testid={TID.auth.pinSubmit}
        >
          {loading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          Sign In
        </button>
      </div>
    </fieldset>
  )
}
