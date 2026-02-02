'use client'

import { useState } from 'react'
import { Building, Lock, Loader2, User, X } from 'lucide-react'
import { useSetBuildingStatus, useDevMembers } from '@/hooks/use-dev'
import { useLockupStatus } from '@/hooks/use-lockup'
import { apiClient } from '@/lib/api-client'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type BuildingStatus = 'secured' | 'open' | 'locking_up'

const STATUS_OPTIONS: { value: BuildingStatus; label: string; className: string }[] = [
  { value: 'secured', label: 'Secured', className: 'btn-warning' },
  { value: 'open', label: 'Open', className: 'btn-success' },
  { value: 'locking_up', label: 'Locking Up', className: 'btn-info' },
]

export function DevToolsPanel() {
  const [showHolderPicker, setShowHolderPicker] = useState(false)
  const [holderSearch, setHolderSearch] = useState('')

  const setBuildingStatus = useSetBuildingStatus()
  const { data: lockupData } = useLockupStatus()
  const { data: membersData } = useDevMembers()
  const queryClient = useQueryClient()

  const acquireLockup = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiClient.lockup.acquireLockup({
        params: { id: memberId },
        body: { notes: 'Dev tools: manual assignment' },
      })
      if (response.status !== 200) {
        const errorBody = response.body as { message?: string }
        throw new Error(errorBody?.message ?? 'Failed to acquire lockup')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockup-status'] })
      setShowHolderPicker(false)
    },
  })

  const clearHolder = useMutation({
    mutationFn: async () => {
      // Use the building status endpoint to reset — set to open clears via clear-all
      // Direct DB update through a dedicated approach: set building status then clear
      const response = await apiClient.dev.clearAllCheckins()
      if (response.status !== 200) {
        throw new Error('Failed to clear holder')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockup-status'] })
      queryClient.invalidateQueries({ queryKey: ['presence'] })
      queryClient.invalidateQueries({ queryKey: ['present-people'] })
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
      queryClient.invalidateQueries({ queryKey: ['dev-members'] })
      queryClient.invalidateQueries({ queryKey: ['dds-status'] })
    },
  })

  const currentStatus = lockupData?.buildingStatus as BuildingStatus | undefined
  const currentHolder = lockupData?.currentHolder

  const filteredMembers = membersData?.members.filter((m) => {
    if (!holderSearch) return m.isPresent
    const q = holderSearch.toLowerCase()
    return (
      (m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.rank.toLowerCase().includes(q)) &&
      m.isPresent
    )
  })

  return (
    <div className="border border-accent/30 rounded-lg p-3 bg-accent/5 space-y-3">
      <div className="text-xs font-semibold text-accent uppercase tracking-wide">Dev Tools</div>

      {/* Building Status */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-base-content/60">
          <Building className="h-3.5 w-3.5" />
          Building Status
        </div>
        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`btn btn-xs flex-1 ${
                currentStatus === opt.value ? opt.className : 'btn-ghost'
              }`}
              disabled={setBuildingStatus.isPending}
              onClick={() => setBuildingStatus.mutate({ buildingStatus: opt.value })}
            >
              {setBuildingStatus.isPending && setBuildingStatus.variables?.buildingStatus === opt.value ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                opt.label
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lockup Holder */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-base-content/60">
          <Lock className="h-3.5 w-3.5" />
          Lockup Holder
          {currentHolder && (
            <span className="ml-auto text-xs font-medium text-base-content">
              {currentHolder.rank} {currentHolder.firstName} {currentHolder.lastName}
            </span>
          )}
          {!currentHolder && (
            <span className="ml-auto text-xs text-base-content/40">No One</span>
          )}
        </div>

        {!showHolderPicker ? (
          <div className="flex gap-1.5">
            <button
              className="btn btn-xs btn-ghost flex-1"
              onClick={() => setShowHolderPicker(true)}
            >
              <User className="h-3 w-3" />
              Assign
            </button>
            {currentHolder && (
              <button
                className="btn btn-xs btn-ghost text-error flex-1"
                disabled={clearHolder.isPending}
                onClick={() => clearHolder.mutate()}
              >
                {clearHolder.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                Clear (Reset All)
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <input
                type="text"
                className="input input-xs input-neutral flex-1"
                placeholder="Search present members..."
                value={holderSearch}
                onChange={(e) => setHolderSearch(e.target.value)}
                autoFocus
              />
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => {
                  setShowHolderPicker(false)
                  setHolderSearch('')
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto rounded border border-base-300">
              {!filteredMembers?.length ? (
                <div className="text-xs text-center py-2 text-base-content/40">
                  No present members found
                </div>
              ) : (
                filteredMembers.map((m) => (
                  <button
                    key={m.id}
                    className="w-full text-left px-2 py-1 text-xs hover:bg-base-200 transition-colors flex items-center justify-between"
                    disabled={acquireLockup.isPending}
                    onClick={() => acquireLockup.mutate(m.id)}
                  >
                    <span>
                      {m.rank} {m.lastName}, {m.firstName}
                    </span>
                    <span className="text-base-content/40">{m.division}</span>
                  </button>
                ))
              )}
            </div>
            {acquireLockup.isError && (
              <p className="text-xs text-error">
                {acquireLockup.error.message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
