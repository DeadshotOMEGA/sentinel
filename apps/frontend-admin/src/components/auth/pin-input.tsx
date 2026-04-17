'use client'

/* global HTMLInputElement */

import { useRef, useEffect, useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import type { RemoteSystemLoginContext, RemoteSystemOption } from '@sentinel/contracts'
import { KeyRound, ArrowLeft, LoaderCircle, LogIn } from 'lucide-react'
import { TID } from '@/lib/test-ids'
import {
  formatRemoteSystemOptionLabel,
  resolveDefaultRemoteSystemId,
  resolveEffectiveRemoteSystemId,
  resolveForcedRemoteSystem,
  type PinInputInitialSelection,
} from './pin-input.logic'

export type { PinInputInitialSelection } from './pin-input.logic'

export interface PinInputSubmission {
  pin: string
  remoteSystemId?: string
  useKioskRemoteSystem?: boolean
}

interface PinInputProps {
  onSubmit: (input: PinInputSubmission) => void
  onBack: () => void
  loading?: boolean
  remoteSystems: RemoteSystemOption[]
  remoteSystemsLoading?: boolean
  remoteSystemsError?: string | null
  initialSelection?: PinInputInitialSelection | null
  loginContext?: RemoteSystemLoginContext | null
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
  loginContext = null,
  forceKioskRemoteSystem = false,
}: PinInputProps) {
  const [pin, setPin] = useState('')
  const [selectedRemoteSystem, setSelectedRemoteSystem] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const forcedRemoteSystem = useMemo(
    () => resolveForcedRemoteSystem(remoteSystems, loginContext),
    [loginContext, remoteSystems]
  )
  const defaultRemoteSystemId = useMemo(() => {
    return resolveDefaultRemoteSystemId({
      remoteSystems,
      initialSelection,
      loginContext,
    })
  }, [initialSelection, loginContext, remoteSystems])

  const effectiveSelectedRemoteSystem = useMemo(
    () =>
      resolveEffectiveRemoteSystemId({
        remoteSystems,
        selectedRemoteSystem,
        initialSelection,
        loginContext,
      }),
    [initialSelection, loginContext, remoteSystems, selectedRemoteSystem]
  )
  const kioskRemoteSystem = remoteSystems.find((system) => system.code === 'kiosk')
  const remoteSystemDescription =
    remoteSystems.find((system) => system.id === effectiveSelectedRemoteSystem)?.description ?? null
  const hasSelectableRemoteSystems = defaultRemoteSystemId.length > 0
  const isHostDevice = loginContext?.isHostDevice === true
  const hostRemoteSystemMissing = isHostDevice && !forcedRemoteSystem
  const canSubmit =
    pin.length === 4 &&
    (forceKioskRemoteSystem
      ? Boolean(kioskRemoteSystem) && !remoteSystemsLoading
      : effectiveSelectedRemoteSystem.length > 0 && !hostRemoteSystemMissing)

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
      ) : isHostDevice ? (
        <fieldset
          className="rounded-box border border-base-300 bg-base-200/70 px-(--space-3) py-(--space-2)"
          data-testid={TID.auth.remoteSystemSelect}
        >
          <legend className="text-xs font-semibold uppercase tracking-[0.1em] text-base-content/60">
            Remote system
          </legend>
          <p className="text-sm font-semibold text-base-content">
            {forcedRemoteSystem?.name ?? 'Server'}{' '}
            <span className="font-normal text-base-content/65">(automatic)</span>
          </p>
          {remoteSystemsLoading && (
            <p className="label mt-(--space-1) text-base-content/60">
              Loading managed remote systems...
            </p>
          )}
          {!remoteSystemsLoading && hostRemoteSystemMissing && (
            <p className="label mt-(--space-1) text-error">
              Server remote system is not active. Ask an admin to restore it in Settings.
            </p>
          )}
          {forcedRemoteSystem?.description && (
            <p className="label mt-(--space-1) text-base-content/60">
              {forcedRemoteSystem.description}
            </p>
          )}
        </fieldset>
      ) : (
        <fieldset className="fieldset">
          <label className="select w-full">
            <span className="label">Remote system</span>
            <select
              value={effectiveSelectedRemoteSystem}
              onChange={(event) => setSelectedRemoteSystem(event.target.value)}
              disabled={loading}
              data-testid={TID.auth.remoteSystemSelect}
            >
              <option value="" disabled>
                Select a remote system
              </option>
              {remoteSystems.map((system) => (
                <option
                  key={system.id}
                  value={system.id}
                  disabled={!system.id || system.isOccupied}
                >
                  {formatRemoteSystemOptionLabel(system, loginContext)}
                </option>
              ))}
            </select>
          </label>
          <p className="label">
            Required so Sentinel can track which managed station is connected.
          </p>
          {!remoteSystemsLoading && remoteSystems.some((system) => system.isOccupied) && (
            <p className="label text-base-content/60">In-use systems stay visible but cannot be selected.</p>
          )}
          {remoteSystemsLoading && (
            <p className="label text-base-content/60">Loading managed remote systems...</p>
          )}
          {!remoteSystemsLoading && !hasSelectableRemoteSystems && !remoteSystemsError && (
            <p className="label text-error">
              {remoteSystems.length === 0
                ? 'No active remote systems are configured. Ask an admin to add one in Settings.'
                : 'All active remote systems are currently in use. Wait for a station to free up or ask an admin.'}
            </p>
          )}
          {remoteSystemDescription && (
            <p className="label text-base-content/60">{remoteSystemDescription}</p>
          )}
        </fieldset>
      )}

      <label className="input input-lg w-full">
        <span className="label">PIN</span>
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          className="grow text-center font-mono text-2xl tracking-[0.45em]"
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
      </label>

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
