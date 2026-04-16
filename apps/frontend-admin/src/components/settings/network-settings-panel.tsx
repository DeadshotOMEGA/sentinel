'use client'

import { useEffect, useMemo, useState } from 'react'
import type { AdminRemoteSystem } from '@sentinel/contracts'
import { ChevronDown, ChevronUp, Pencil, Plus, Save, Trash2, Wifi } from 'lucide-react'
import { toast } from 'sonner'
import {
  AppCard,
  AppCardAction,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { AppAlert } from '@/components/ui/AppAlert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useNetworkSettings, useUpdateNetworkSettings } from '@/hooks/use-network-settings'
import {
  useAdminRemoteSystems,
  useCreateRemoteSystem,
  useDeleteRemoteSystem,
  useReorderRemoteSystems,
  useUpdateRemoteSystem,
} from '@/hooks/use-remote-systems'
import { TID } from '@/lib/test-ids'
import { AccountLevel, useAuthStore } from '@/store/auth-store'

interface RemoteSystemFormState {
  code: string
  name: string
  description: string
  isActive: boolean
}

const EMPTY_REMOTE_SYSTEM_FORM: RemoteSystemFormState = {
  code: '',
  name: '',
  description: '',
  isActive: true,
}

function normalizeSsids(ssids: string[]): string[] {
  const normalized: string[] = []
  const seen = new Set<string>()

  for (const value of ssids) {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      continue
    }

    const key = trimmed.toLowerCase()
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    normalized.push(trimmed)
  }

  return normalized
}

function formatUpdatedAt(value: string | null): string {
  if (!value) {
    return 'Not yet saved'
  }

  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    return 'Unknown'
  }

  return timestamp.toLocaleString()
}

function toFormState(system?: AdminRemoteSystem | null): RemoteSystemFormState {
  if (!system) {
    return { ...EMPTY_REMOTE_SYSTEM_FORM }
  }

  return {
    code: system.code,
    name: system.name,
    description: system.description ?? '',
    isActive: system.isActive,
  }
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`badge ${active ? 'badge-success' : 'badge-ghost'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

export function NetworkSettingsPanel() {
  const member = useAuthStore((state) => state.member)
  const canEdit = (member?.accountLevel ?? 0) >= AccountLevel.ADMIN
  const networkSettingsQuery = useNetworkSettings()
  const remoteSystemsQuery = useAdminRemoteSystems({ enabled: true })
  const updateNetworkSettings = useUpdateNetworkSettings()
  const createRemoteSystem = useCreateRemoteSystem()
  const updateRemoteSystem = useUpdateRemoteSystem()
  const deleteRemoteSystem = useDeleteRemoteSystem()
  const reorderRemoteSystems = useReorderRemoteSystems()

  const [ssidDrafts, setSsidDrafts] = useState<string[]>([''])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSystem, setEditingSystem] = useState<AdminRemoteSystem | null>(null)
  const [formState, setFormState] = useState<RemoteSystemFormState>(EMPTY_REMOTE_SYSTEM_FORM)

  useEffect(() => {
    if (!networkSettingsQuery.data) {
      return
    }

    const nextDrafts = networkSettingsQuery.data.settings.approvedSsids
    setSsidDrafts(nextDrafts.length > 0 ? [...nextDrafts] : [''])
  }, [networkSettingsQuery.data])

  const normalizedSsidDrafts = useMemo(() => normalizeSsids(ssidDrafts), [ssidDrafts])
  const savedSsids = networkSettingsQuery.data?.settings.approvedSsids ?? []
  const isSsidDirty = JSON.stringify(normalizedSsidDrafts) !== JSON.stringify(savedSsids)

  const openCreateDialog = () => {
    setEditingSystem(null)
    setFormState({ ...EMPTY_REMOTE_SYSTEM_FORM })
    setDialogOpen(true)
  }

  const openEditDialog = (system: AdminRemoteSystem) => {
    setEditingSystem(system)
    setFormState(toFormState(system))
    setDialogOpen(true)
  }

  const handleSaveSsids = async () => {
    if (!canEdit) {
      return
    }

    try {
      const result = await updateNetworkSettings.mutateAsync({
        approvedSsids: normalizedSsidDrafts,
      })
      setSsidDrafts(
        result.settings.approvedSsids.length > 0 ? [...result.settings.approvedSsids] : ['']
      )
      toast.success('Approved Wi-Fi allowlist saved')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save approved Wi-Fi allowlist'
      )
    }
  }

  const handleResetSsids = () => {
    setSsidDrafts(savedSsids.length > 0 ? [...savedSsids] : [''])
  }

  const handleSaveRemoteSystem = async () => {
    if (!canEdit) {
      return
    }

    const payload = {
      code: formState.code,
      name: formState.name,
      description: formState.description || undefined,
      ...(editingSystem ? { isActive: formState.isActive } : {}),
    }

    try {
      if (editingSystem) {
        await updateRemoteSystem.mutateAsync({
          id: editingSystem.id,
          input: payload,
        })
        toast.success('Remote system updated')
      } else {
        await createRemoteSystem.mutateAsync(payload)
        toast.success('Remote system created')
      }

      setDialogOpen(false)
      setEditingSystem(null)
      setFormState({ ...EMPTY_REMOTE_SYSTEM_FORM })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save remote system')
    }
  }

  const handleToggleRemoteSystem = async (system: AdminRemoteSystem) => {
    if (!canEdit) {
      return
    }

    try {
      await updateRemoteSystem.mutateAsync({
        id: system.id,
        input: { isActive: !system.isActive },
      })
      toast.success(system.isActive ? 'Remote system deactivated' : 'Remote system reactivated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update remote system')
    }
  }

  const handleDeleteRemoteSystem = async (system: AdminRemoteSystem) => {
    if (!canEdit || system.usageCount > 0) {
      return
    }

    const confirmed = window.confirm(
      `Delete remote system "${system.name}"? This cannot be undone.`
    )
    if (!confirmed) {
      return
    }

    try {
      await deleteRemoteSystem.mutateAsync(system.id)
      toast.success('Remote system deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete remote system')
    }
  }

  const handleMoveRemoteSystem = async (systemId: string, direction: -1 | 1) => {
    if (!canEdit || !remoteSystemsQuery.data) {
      return
    }

    const orderedIds = remoteSystemsQuery.data.map((system) => system.id)
    const currentIndex = orderedIds.indexOf(systemId)
    const targetIndex = currentIndex + direction

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedIds.length) {
      return
    }

    const reordered = [...orderedIds]
    const [movedId] = reordered.splice(currentIndex, 1)
    reordered.splice(targetIndex, 0, movedId as string)

    try {
      await reorderRemoteSystems.mutateAsync(reordered)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reorder remote systems')
    }
  }

  if (networkSettingsQuery.isLoading || remoteSystemsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  if (networkSettingsQuery.isError) {
    return (
      <AppCard status="error">
        <AppCardHeader>
          <AppCardTitle className="flex items-center gap-(--space-2)">
            <Wifi className="h-5 w-5" />
            Network
          </AppCardTitle>
          <AppCardDescription>Unable to load network settings from the backend.</AppCardDescription>
        </AppCardHeader>
        <AppCardContent>
          <AppAlert tone="error">
            {networkSettingsQuery.error instanceof Error
              ? networkSettingsQuery.error.message
              : 'Unknown error'}
          </AppAlert>
        </AppCardContent>
      </AppCard>
    )
  }

  return (
    <div className="space-y-4">
      <AppCard variant="elevated">
        <AppCardHeader>
          <AppCardTitle className="flex items-center gap-(--space-2)">
            <Wifi className="h-5 w-5" />
            Network
          </AppCardTitle>
          <AppCardDescription>
            Approved Wi-Fi SSIDs keep deployment status honest even when Docker is healthy locally.
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent className="space-y-3">
          <AppAlert tone="info">
            Source: <strong>{networkSettingsQuery.data?.metadata.source ?? 'unknown'}</strong> |
            Last update: {formatUpdatedAt(networkSettingsQuery.data?.metadata.updatedAt ?? null)}
          </AppAlert>
          {!canEdit && (
            <AppAlert tone="warning">
              Admin or Developer account level is required to save network settings.
            </AppAlert>
          )}
          <div className="space-y-2">
            {ssidDrafts.map((ssid, index) => (
              <div key={`ssid-${index}`} className="flex items-center gap-(--space-2)">
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Approved Wi-Fi SSID"
                  value={ssid}
                  onChange={(event) => {
                    setSsidDrafts((current) =>
                      current.map((value, valueIndex) =>
                        valueIndex === index ? event.target.value : value
                      )
                    )
                  }}
                  disabled={!canEdit || updateNetworkSettings.isPending}
                  data-testid={TID.settings.network.ssidInput(index)}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    setSsidDrafts((current) =>
                      current.length > 1
                        ? current.filter((_, valueIndex) => valueIndex !== index)
                        : ['']
                    )
                  }
                  disabled={!canEdit || updateNetworkSettings.isPending}
                  data-testid={TID.settings.network.removeSsid(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-(--space-2)">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setSsidDrafts((current) => [...current, ''])}
              disabled={!canEdit || updateNetworkSettings.isPending}
              data-testid={TID.settings.network.addSsid}
            >
              <Plus className="h-4 w-4" />
              Add SSID
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSaveSsids}
              disabled={!canEdit || !isSsidDirty || updateNetworkSettings.isPending}
              data-testid={TID.settings.network.saveSsids}
            >
              <Save className="h-4 w-4" />
              Save Allowlist
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleResetSsids}
              disabled={!isSsidDirty || updateNetworkSettings.isPending}
              data-testid={TID.settings.network.resetSsids}
            >
              Reset
            </button>
          </div>
        </AppCardContent>
      </AppCard>

      <AppCard>
        <AppCardHeader>
          <div>
            <AppCardTitle>Remote Systems</AppCardTitle>
            <AppCardDescription>
              Managed stations shown during login and tracked in system-status presence.
            </AppCardDescription>
          </div>
          <AppCardAction>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={openCreateDialog}
              disabled={!canEdit}
              data-testid={TID.settings.network.addRemoteSystem}
            >
              <Plus className="h-4 w-4" />
              Add Remote System
            </button>
          </AppCardAction>
        </AppCardHeader>
        <AppCardContent className="space-y-3">
          {remoteSystemsQuery.isError && (
            <AppAlert tone="error">
              {remoteSystemsQuery.error instanceof Error
                ? remoteSystemsQuery.error.message
                : 'Failed to load remote systems'}
            </AppAlert>
          )}
          {!canEdit && (
            <AppAlert tone="warning">
              Admin or Developer account level is required to manage remote systems.
            </AppAlert>
          )}
          <div className="overflow-x-auto border border-base-300">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th className="text-right">Logged In (Total)</th>
                  <th className="text-right">Connected Now</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {remoteSystemsQuery.data && remoteSystemsQuery.data.length > 0 ? (
                  remoteSystemsQuery.data.map((system, index) => (
                    <tr key={system.id}>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-(--space-1)">
                          <button
                            type="button"
                            className="btn btn-ghost btn-square btn-xs"
                            onClick={() => handleMoveRemoteSystem(system.id, -1)}
                            disabled={!canEdit || index === 0 || reorderRemoteSystems.isPending}
                            data-testid={TID.settings.network.moveRemoteSystemUp(system.id)}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-square btn-xs"
                            onClick={() => handleMoveRemoteSystem(system.id, 1)}
                            disabled={
                              !canEdit ||
                              index === remoteSystemsQuery.data.length - 1 ||
                              reorderRemoteSystems.isPending
                            }
                            data-testid={TID.settings.network.moveRemoteSystemDown(system.id)}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="whitespace-nowrap font-medium">{system.name}</td>
                      <td className="whitespace-nowrap font-mono text-xs">{system.code}</td>
                      <td className="max-w-80 text-sm text-base-content/70">
                        {system.description || 'No description'}
                      </td>
                      <td className="whitespace-nowrap">
                        <StatusBadge active={system.isActive} />
                      </td>
                      <td className="text-right">
                        <span className="badge badge-outline">{system.usageCount}</span>
                      </td>
                      <td className="text-right">
                        <span
                          className={`badge ${system.activeSessionCount > 0 ? 'badge-success' : 'badge-ghost'}`}
                        >
                          {system.activeSessionCount}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-(--space-1)">
                          <button
                            type="button"
                            className="btn btn-ghost btn-square btn-sm"
                            onClick={() => openEditDialog(system)}
                            disabled={!canEdit}
                            data-testid={TID.settings.network.editRemoteSystem(system.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleToggleRemoteSystem(system)}
                            disabled={!canEdit || updateRemoteSystem.isPending}
                            data-testid={TID.settings.network.toggleRemoteSystem(system.id)}
                          >
                            {system.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-square btn-sm"
                            onClick={() => handleDeleteRemoteSystem(system)}
                            disabled={
                              !canEdit || system.usageCount > 0 || deleteRemoteSystem.isPending
                            }
                            data-testid={TID.settings.network.deleteRemoteSystem(system.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-base-content/60">
                      No managed remote systems found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AppCardContent>
      </AppCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="sm:max-w-[34rem]"
          testId={TID.settings.network.remoteSystemDialog}
        >
          <DialogHeader>
            <DialogTitle>{editingSystem ? 'Edit Remote System' : 'Add Remote System'}</DialogTitle>
            <DialogDescription>
              Managed remote systems appear in login and are tracked for total and live connected
              usage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Code</legend>
              <input
                type="text"
                className="input w-full"
                value={formState.code}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, code: event.target.value }))
                }
                disabled={createRemoteSystem.isPending || updateRemoteSystem.isPending}
                data-testid={TID.settings.network.remoteSystemCode}
              />
              <p className="label">
                Lowercase letters, numbers, spaces, and dashes are normalized automatically.
              </p>
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Name</legend>
              <input
                type="text"
                className="input w-full"
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, name: event.target.value }))
                }
                disabled={createRemoteSystem.isPending || updateRemoteSystem.isPending}
                data-testid={TID.settings.network.remoteSystemName}
              />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Description</legend>
              <input
                type="text"
                className="input w-full"
                value={formState.description}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, description: event.target.value }))
                }
                disabled={createRemoteSystem.isPending || updateRemoteSystem.isPending}
                data-testid={TID.settings.network.remoteSystemDescription}
              />
            </fieldset>
            <label className="flex items-center gap-(--space-2) text-sm">
              <Checkbox
                checked={formState.isActive}
                onCheckedChange={(checked) =>
                  setFormState((current) => ({ ...current, isActive: checked }))
                }
                disabled={!editingSystem}
                data-testid={TID.settings.network.remoteSystemActive}
              />
              Keep this remote system active for login selection
            </label>
          </div>
          <DialogFooter className="flex items-center justify-between gap-(--space-2)">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDialogOpen(false)}
              data-testid={TID.settings.network.remoteSystemCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveRemoteSystem}
              disabled={
                formState.code.trim().length === 0 ||
                formState.name.trim().length === 0 ||
                createRemoteSystem.isPending ||
                updateRemoteSystem.isPending
              }
              data-testid={TID.settings.network.remoteSystemSubmit}
            >
              {editingSystem ? 'Save Changes' : 'Create Remote System'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
