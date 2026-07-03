'use client'

import { useMemo, useState } from 'react'
import type { RemoteSystemLoginContext, RemoteSystemOption } from '@sentinel/contracts'
import { ArrowLeft, LoaderCircle, LogIn, MonitorCheck } from 'lucide-react'
import { TID } from '@/lib/test-ids'
import {
  formatRemoteSystemOptionLabel,
  resolveDefaultRemoteSystemId,
  resolveEffectiveRemoteSystemId,
  resolveForcedRemoteSystem,
  type RemoteSystemLoginInitialSelection,
} from './remote-system-login.logic'

export type { RemoteSystemLoginInitialSelection } from './remote-system-login.logic'

export interface RemoteSystemLoginSubmission {
  remoteSystemId?: string
  useKioskRemoteSystem?: boolean
}

interface RemoteSystemLoginProps {
  onSubmit: (input: RemoteSystemLoginSubmission) => void
  onBack: () => void
  loading?: boolean
  remoteSystems: RemoteSystemOption[]
  remoteSystemsLoading?: boolean
  remoteSystemsError?: string | null
  initialSelection?: RemoteSystemLoginInitialSelection | null
  loginContext?: RemoteSystemLoginContext | null
  forceKioskRemoteSystem?: boolean
}

export function RemoteSystemLogin({
  onSubmit,
  onBack,
  loading = false,
  remoteSystems,
  remoteSystemsLoading = false,
  remoteSystemsError = null,
  initialSelection = null,
  loginContext = null,
  forceKioskRemoteSystem = false,
}: RemoteSystemLoginProps) {
  const [selectedRemoteSystem, setSelectedRemoteSystem] = useState('')

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
  const canSubmit = forceKioskRemoteSystem
    ? Boolean(kioskRemoteSystem) && !remoteSystemsLoading
    : effectiveSelectedRemoteSystem.length > 0 && !hostRemoteSystemMissing

  const handleSubmit = () => {
    if (!canSubmit) {
      return
    }

    if (forceKioskRemoteSystem) {
      onSubmit({
        useKioskRemoteSystem: true,
      })
      return
    }

    onSubmit({
      remoteSystemId: effectiveSelectedRemoteSystem,
    })
  }

  return (
    <form
      className="space-y-(--space-4)"
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit()
      }}
    >
      <fieldset className="fieldset space-y-(--space-4)">
        <legend className="fieldset-legend mx-auto text-center text-2xl font-semibold">
          Confirm workstation
        </legend>
        <div className="flex justify-center">
          <div className="rounded-full bg-primary-fadded p-(--space-3) text-primary-fadded-content">
            <MonitorCheck size={36} strokeWidth={1.75} />
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
              <p className="label text-base-content/60">
                In-use systems stay visible but cannot be selected.
              </p>
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

        <div className="grid grid-cols-2 gap-(--space-2)">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onBack}
            disabled={loading}
            data-testid={TID.auth.loginBack}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!canSubmit || loading}
            data-testid={TID.auth.loginSubmit}
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
    </form>
  )
}
