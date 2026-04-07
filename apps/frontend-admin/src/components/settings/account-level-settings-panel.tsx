'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { MemberResponse } from '@sentinel/contracts'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { Checkbox } from '@/components/ui/checkbox'
import { ButtonSpinner, LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDivisions } from '@/hooks/use-divisions'
import { useEnums } from '@/hooks/use-enums'
import { useMembers, useUpdateMember } from '@/hooks/use-members'
import { AccountLevel, useAuthStore } from '@/store/auth-store'
import { AlertTriangle, Shield, Users } from 'lucide-react'

type AssignableAccountLevel = (typeof AccountLevel)[keyof typeof AccountLevel]

type AccountLevelDefinition = {
  level: AssignableAccountLevel
  label: string
  summary: string
  permissions: string[]
}

const ACCOUNT_LEVEL_DEFINITIONS: AccountLevelDefinition[] = [
  {
    level: AccountLevel.BASIC,
    label: 'Basic',
    summary: 'Default member access for routine Sentinel sign-in and day-to-day use.',
    permissions: [
      'Sign in and out of Sentinel.',
      'Use member-facing operational flows that do not require elevated authority.',
    ],
  },
  {
    level: AccountLevel.QUARTERMASTER,
    label: 'Quartermaster',
    summary: 'Adds routine floor-management actions on top of Basic access.',
    permissions: [
      'Everything in Basic.',
      'Support routine checkout and dashboard operations that require member-management authority.',
    ],
  },
  {
    level: AccountLevel.LOCKUP,
    label: 'Lockup',
    summary: 'Adds lockup and building-control authority for qualified operators.',
    permissions: [
      'Everything in Quartermaster.',
      'Open the building, transfer lockup, and complete lockup workflows when authorized.',
    ],
  },
  {
    level: AccountLevel.COMMAND,
    label: 'Command',
    summary: 'Adds command-level oversight for operational and security actions.',
    permissions: [
      'Everything in Lockup.',
      'Use command-only workflows such as higher-trust acknowledgements and oversight actions.',
    ],
  },
  {
    level: AccountLevel.ADMIN,
    label: 'Admin',
    summary: 'Administrative access for member records, PIN management, and Sentinel settings.',
    permissions: [
      'Everything in Command.',
      'Manage members, settings, remote systems, and assign account levels up to Admin.',
    ],
  },
  {
    level: AccountLevel.DEVELOPER,
    label: 'Developer',
    summary: 'Full system access for development, troubleshooting, and advanced recovery tools.',
    permissions: [
      'Everything in Admin.',
      'Use developer tooling, deep diagnostics, and assign any Sentinel account level.',
    ],
  },
]

function getLevelDefinition(level: number): AccountLevelDefinition | undefined {
  return ACCOUNT_LEVEL_DEFINITIONS.find((definition) => definition.level === level)
}

function getAssignableLevels(actorLevel: number): AccountLevelDefinition[] {
  return ACCOUNT_LEVEL_DEFINITIONS.filter((definition) => definition.level <= actorLevel)
}

export function AccountLevelSettingsPanel() {
  const signedInMember = useAuthStore((state) => state.member)
  const actorLevel = signedInMember?.accountLevel ?? 0
  const canEdit = actorLevel >= AccountLevel.ADMIN
  const updateMember = useUpdateMember()
  const {
    data: membersData,
    isLoading,
    isError,
    error,
  } = useMembers({
    page: 1,
    limit: 500,
    includeHidden: true,
  })
  const { data: divisions } = useDivisions()
  const { data: enums } = useEnums()

  const [selection, setSelection] = useState<Record<string, boolean>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const assignableLevels = useMemo(() => getAssignableLevels(actorLevel), [actorLevel])
  const [nextLevel, setNextLevel] = useState<number>(
    assignableLevels[0]?.level ?? AccountLevel.BASIC
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)

  const divisionMap = useMemo(() => {
    return new Map((divisions?.divisions ?? []).map((division) => [division.id, division.name]))
  }, [divisions])

  const statusMap = useMemo(() => {
    return new Map((enums?.memberStatuses ?? []).map((status) => [status.id, status.name]))
  }, [enums])

  const members = membersData?.members ?? []
  const selectedMemberIds = useMemo(
    () => Object.entries(selection).flatMap(([memberId, checked]) => (checked ? [memberId] : [])),
    [selection]
  )
  const selectedCount = selectedMemberIds.length

  const groupedMembers = useMemo(() => {
    const groups = new Map<number, MemberResponse[]>()

    for (const definition of ACCOUNT_LEVEL_DEFINITIONS) {
      groups.set(definition.level, [])
    }

    for (const member of members) {
      const existing = groups.get(member.accountLevel) ?? []
      existing.push(member)
      groups.set(member.accountLevel, existing)
    }

    for (const groupMembers of groups.values()) {
      groupMembers.sort((a, b) => {
        if (a.rank !== b.rank) {
          return a.rank.localeCompare(b.rank)
        }

        return a.displayName.localeCompare(b.displayName)
      })
    }

    return ACCOUNT_LEVEL_DEFINITIONS.map((definition) => ({
      definition,
      members: groups.get(definition.level) ?? [],
    }))
  }, [members])

  const handleToggleMember = (memberId: string, checked: boolean) => {
    setSelection((current) => ({
      ...current,
      [memberId]: checked,
    }))
  }

  const handleToggleGroup = (memberIds: string[], checked: boolean) => {
    setSelection((current) => {
      const nextSelection = { ...current }
      for (const memberId of memberIds) {
        nextSelection[memberId] = checked
      }
      return nextSelection
    })
  }

  const handleClearSelection = () => {
    setSelection({})
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setProgress(0)
      if (assignableLevels[0]) {
        setNextLevel(assignableLevels[0].level)
      }
    }
    setDialogOpen(open)
  }

  const handleApplyLevel = async () => {
    if (!canEdit || selectedMemberIds.length === 0) {
      return
    }

    setIsSubmitting(true)
    setProgress(0)

    const results: PromiseSettledResult<unknown>[] = []

    for (let index = 0; index < selectedMemberIds.length; index += 1) {
      const memberId = selectedMemberIds[index]

      const result = await Promise.allSettled([
        updateMember.mutateAsync({
          id: memberId,
          data: {
            accountLevel: nextLevel,
          },
        }),
      ])

      results.push(result[0])
      setProgress(Math.round(((index + 1) / selectedMemberIds.length) * 100))
    }

    const failedCount = results.filter((result) => result.status === 'rejected').length
    const succeededCount = results.length - failedCount
    const targetLabel = getLevelDefinition(nextLevel)?.label ?? `Level ${nextLevel}`

    setIsSubmitting(false)

    if (failedCount === 0) {
      toast.success(
        `Updated ${succeededCount} member${succeededCount === 1 ? '' : 's'} to ${targetLabel}`
      )
      handleClearSelection()
      handleDialogOpenChange(false)
      return
    }

    toast.error(
      `${failedCount} update${failedCount === 1 ? '' : 's'} failed while assigning ${targetLabel}`
    )
  }

  if (isLoading) {
    return (
      <AppCard>
        <AppCardContent
          className="flex items-center justify-center"
          style={{ minHeight: '20rem', padding: 'var(--space-6)' }}
        >
          <LoadingSpinner size="lg" className="text-base-content/60" />
        </AppCardContent>
      </AppCard>
    )
  }

  if (isError) {
    return (
      <AppCard status="error">
        <AppCardHeader>
          <AppCardTitle>Account Levels</AppCardTitle>
          <AppCardDescription>
            {error instanceof Error ? error.message : 'Failed to load account level data.'}
          </AppCardDescription>
        </AppCardHeader>
      </AppCard>
    )
  }

  return (
    <>
      <div
        className="grid items-start"
        style={{
          gap: 'var(--space-4)',
          gridTemplateColumns: 'minmax(0, 1fr)',
        }}
      >
        <div
          className="grid items-start xl:grid-cols-[minmax(0,1fr)_20rem]"
          style={{ gap: 'var(--space-4)' }}
        >
          <div className="grid" style={{ gap: 'var(--space-4)' }}>
            <AppCard>
              <AppCardHeader>
                <AppCardTitle>Account Level Directory</AppCardTitle>
                <AppCardDescription>
                  Review Sentinel access by level, select multiple members, and assign a new user
                  level in one pass.
                </AppCardDescription>
              </AppCardHeader>
              <AppCardContent style={{ display: 'grid', gap: 'var(--space-4)' }}>
                {!canEdit ? (
                  <div role="alert" className="alert alert-warning alert-soft">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Admin or Developer access is required to change account levels.</span>
                  </div>
                ) : null}

                {membersData && membersData.total > members.length ? (
                  <div role="alert" className="alert alert-info alert-soft">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      Showing the first {members.length} members. Refine member records if the
                      directory grows beyond 500 entries.
                    </span>
                  </div>
                ) : null}

                <div
                  className="flex flex-wrap items-center justify-between border border-base-300 bg-base-200/50"
                  style={{ gap: 'var(--space-3)', padding: 'var(--space-3)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center bg-base-100">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {members.length} member{members.length === 1 ? '' : 's'} indexed
                      </p>
                      <p className="text-sm text-base-content/60">
                        {selectedCount} selected for reassignment
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={handleClearSelection}
                      disabled={selectedCount === 0}
                    >
                      Clear selection
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setDialogOpen(true)}
                      disabled={!canEdit || selectedCount === 0}
                    >
                      Change level
                    </button>
                  </div>
                </div>
              </AppCardContent>
            </AppCard>

            {groupedMembers.map(({ definition, members: groupMembers }) => {
              const groupMemberIds = groupMembers.map((member) => member.id)
              const selectableGroupMemberIds = groupMembers
                .filter((member) => canEdit && member.accountLevel <= actorLevel)
                .map((member) => member.id)
              const selectedInGroup = groupMemberIds.filter(
                (memberId) => selection[memberId]
              ).length
              const allSelected =
                selectableGroupMemberIds.length > 0 &&
                selectableGroupMemberIds.every((memberId) => selection[memberId] === true)
              const someSelected = selectedInGroup > 0 && !allSelected

              return (
                <AppCard key={definition.level}>
                  <AppCardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <AppCardTitle>
                          {definition.label} ({definition.level})
                        </AppCardTitle>
                        <AppCardDescription>{definition.summary}</AppCardDescription>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-base-content/60">
                        <Users className="h-4 w-4" />
                        <span>
                          {groupMembers.length} member{groupMembers.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </AppCardHeader>
                  <AppCardContent style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox
                          checked={allSelected}
                          indeterminate={someSelected}
                          onCheckedChange={(checked) =>
                            handleToggleGroup(selectableGroupMemberIds, checked === true)
                          }
                          disabled={selectableGroupMemberIds.length === 0}
                          aria-label={`Select all ${definition.label} members`}
                        />
                        Select all in {definition.label}
                      </label>
                      {selectedInGroup > 0 ? (
                        <span className="text-sm text-base-content/60">
                          {selectedInGroup} selected in this group
                        </span>
                      ) : null}
                    </div>

                    <div className="overflow-x-auto border border-base-300">
                      <table className="table table-sm table-zebra">
                        <thead>
                          <tr>
                            <th className="w-12"></th>
                            <th>Service #</th>
                            <th>Name</th>
                            <th>Rank</th>
                            <th>Division</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupMembers.length > 0 ? (
                            groupMembers.map((member) => (
                              <tr
                                key={member.id}
                                className={
                                  selection[member.id]
                                    ? 'bg-primary-fadded text-primary-fadded-content'
                                    : ''
                                }
                              >
                                <td>
                                  <Checkbox
                                    checked={selection[member.id] === true}
                                    onCheckedChange={(checked) =>
                                      handleToggleMember(member.id, checked === true)
                                    }
                                    disabled={!canEdit || member.accountLevel > actorLevel}
                                    aria-label={`Select ${member.displayName}`}
                                  />
                                </td>
                                <td className="font-mono text-sm">{member.serviceNumber}</td>
                                <td>{member.displayName}</td>
                                <td>{member.rank}</td>
                                <td>
                                  {member.divisionId
                                    ? (divisionMap.get(member.divisionId) ?? 'Unknown')
                                    : '—'}
                                </td>
                                <td>
                                  {member.memberStatusId
                                    ? (statusMap.get(member.memberStatusId) ?? 'Unknown')
                                    : '—'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="text-center text-base-content/60">
                                No members are currently assigned to this level.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </AppCardContent>
                </AppCard>
              )
            })}
          </div>

          <div
            className="grid gap-4 xl:sticky"
            style={{ top: 'var(--space-4)', height: 'fit-content' }}
          >
            <AppCard>
              <AppCardHeader>
                <AppCardTitle>Level Reference</AppCardTitle>
                <AppCardDescription>
                  Use this sidebar to confirm what each Sentinel account level can do.
                </AppCardDescription>
              </AppCardHeader>
              <AppCardContent style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {ACCOUNT_LEVEL_DEFINITIONS.map((definition) => (
                  <div
                    key={definition.level}
                    className="border border-base-300 bg-base-200/40"
                    style={{ padding: 'var(--space-3)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold">
                        {definition.label} ({definition.level})
                      </h3>
                    </div>
                    <p className="mt-1 text-sm text-base-content/70">{definition.summary}</p>
                    <ul className="mt-2 list-disc pl-4 text-sm text-base-content/80">
                      {definition.permissions.map((permission) => (
                        <li key={permission}>{permission}</li>
                      ))}
                    </ul>
                  </div>
                ))}

                <div role="alert" className="alert alert-info alert-soft">
                  <Shield className="h-4 w-4" />
                  <span>
                    Scheduled DDS and Live DDS members are treated as building-authorized for that
                    operational day, even if their saved account level is lower.
                  </span>
                </div>
              </AppCardContent>
            </AppCard>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Change Account Level</DialogTitle>
            <DialogDescription>
              Assign a new account level to {selectedCount} selected member
              {selectedCount === 1 ? '' : 's'}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">New account level</legend>
              <select
                className="select"
                value={nextLevel}
                onChange={(event) => setNextLevel(Number(event.target.value))}
                disabled={isSubmitting}
              >
                {assignableLevels.map((definition) => (
                  <option key={definition.level} value={definition.level}>
                    {definition.label} ({definition.level})
                  </option>
                ))}
              </select>
            </fieldset>

            {isSubmitting ? (
              <div className="grid gap-2">
                <progress className="progress progress-primary w-full" value={progress} max={100} />
                <p className="text-center text-sm text-base-content/60">Updating... {progress}%</p>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleApplyLevel}
              disabled={isSubmitting || selectedCount === 0}
            >
              {isSubmitting ? <ButtonSpinner /> : null}
              Apply level
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
