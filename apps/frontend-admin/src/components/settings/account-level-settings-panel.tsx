'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { MemberResponse } from '@sentinel/contracts'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { Chip } from '@/components/ui/chip'
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
import { useTags } from '@/hooks/use-member-tags'
import { useMembers, useUpdateMember } from '@/hooks/use-members'
import { AccountLevel, useAuthStore } from '@/store/auth-store'
import { AlertTriangle, BookOpenText, SlidersHorizontal, Shield, Users, X } from 'lucide-react'

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
  const [selectedRanks, setSelectedRanks] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [draftRanks, setDraftRanks] = useState<string[]>([])
  const [draftTags, setDraftTags] = useState<string[]>([])
  const [collapsedLevels, setCollapsedLevels] = useState<Record<number, boolean>>({})
  const {
    data: membersData,
    isLoading,
    isError,
    error,
  } = useMembers({
    page: 1,
    limit: 500,
    includeHidden: true,
    ranks: selectedRanks,
    tags: selectedTags,
  })
  const { data: divisions } = useDivisions()
  const { data: enums } = useEnums()
  const { data: tags = [] } = useTags()

  const [selection, setSelection] = useState<Record<string, boolean>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
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
  const memberRankSet = useMemo(() => new Set(members.map((member) => member.rank)), [members])
  const rankSortOrderMap = useMemo(
    () => new Map((enums?.rankDetails ?? []).map((rank) => [rank.code, rank.displayOrder])),
    [enums?.rankDetails]
  )
  const rankOptions = useMemo(
    () =>
      [...(enums?.rankDetails ?? [])]
        .filter((rank) => memberRankSet.has(rank.code))
        .sort((left, right) => {
          if (left.displayOrder !== right.displayOrder) {
            return right.displayOrder - left.displayOrder
          }

          return left.code.localeCompare(right.code)
        }),
    [enums?.rankDetails, memberRankSet]
  )
  const tagOptions = useMemo(
    () =>
      [...tags]
        .filter((tag) => !tag.isPositional)
        .sort((left, right) => {
          if ((left.displayOrder ?? 0) !== (right.displayOrder ?? 0)) {
            return (left.displayOrder ?? 0) - (right.displayOrder ?? 0)
          }

          return left.name.localeCompare(right.name)
        }),
    [tags]
  )

  const selectedMemberIds = useMemo(
    () => Object.entries(selection).flatMap(([memberId, checked]) => (checked ? [memberId] : [])),
    [selection]
  )
  const selectedCount = selectedMemberIds.length
  const hasActiveFilters = selectedTags.length > 0 || selectedRanks.length > 0

  useEffect(() => {
    setSelection({})
  }, [selectedRanks, selectedTags])

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
        const rankA = rankSortOrderMap.get(a.rank) ?? 0
        const rankB = rankSortOrderMap.get(b.rank) ?? 0
        if (rankA !== rankB) {
          return rankB - rankA
        }

        const lastNameComparison = a.lastName.localeCompare(b.lastName, undefined, {
          sensitivity: 'base',
        })
        if (lastNameComparison !== 0) {
          return lastNameComparison
        }

        const firstNameComparison = a.firstName.localeCompare(b.firstName, undefined, {
          sensitivity: 'base',
        })
        if (firstNameComparison !== 0) {
          return firstNameComparison
        }

        return a.serviceNumber.localeCompare(b.serviceNumber, undefined, { numeric: true })
      })
    }

    return ACCOUNT_LEVEL_DEFINITIONS.map((definition) => ({
      definition,
      members: groups.get(definition.level) ?? [],
    }))
  }, [members, rankSortOrderMap])

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

  const handleToggleRankFilter = (rankCode: string, checked: boolean) => {
    setSelectedRanks((current) =>
      checked ? [...current, rankCode] : current.filter((value) => value !== rankCode)
    )
  }

  const handleToggleTagFilter = (tagName: string, checked: boolean) => {
    setSelectedTags((current) =>
      checked ? [...current, tagName] : current.filter((value) => value !== tagName)
    )
  }

  const handleToggleDraftRankFilter = (rankCode: string, checked: boolean) => {
    setDraftRanks((current) =>
      checked ? [...current, rankCode] : current.filter((value) => value !== rankCode)
    )
  }

  const handleToggleDraftTagFilter = (tagName: string, checked: boolean) => {
    setDraftTags((current) =>
      checked ? [...current, tagName] : current.filter((value) => value !== tagName)
    )
  }

  const handleOpenFilterDialog = () => {
    setDraftRanks(selectedRanks)
    setDraftTags(selectedTags)
    setFilterDialogOpen(true)
  }

  const handleFilterDialogOpenChange = (open: boolean) => {
    if (!open) {
      setDraftRanks(selectedRanks)
      setDraftTags(selectedTags)
    }

    setFilterDialogOpen(open)
  }

  const handleApplyFilters = () => {
    setSelectedRanks(draftRanks)
    setSelectedTags(draftTags)
    setFilterDialogOpen(false)
  }

  const handleClearDraftFilters = () => {
    setDraftRanks([])
    setDraftTags([])
  }

  const handleToggleGroupCollapsed = (level: number) => {
    setCollapsedLevels((current) => ({
      ...current,
      [level]: !current[level],
    }))
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
          className="grid items-start xl:grid-cols-[minmax(0,1fr)_17rem]"
          style={{ gap: 'var(--space-4)' }}
        >
          <div className="grid" style={{ gap: 'var(--space-4)' }}>
            <AppCard>
              <AppCardHeader>
                <AppCardTitle>Account Level Directory</AppCardTitle>
                <AppCardDescription>
                  Review access by level, refine the directory, and reassign selected members in one
                  pass.
                </AppCardDescription>
              </AppCardHeader>
              <AppCardContent style={{ display: 'grid', gap: 'var(--space-3)' }}>
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
                  className={`flex flex-wrap items-center justify-between border-y ${
                    selectedCount > 0
                      ? 'border-primary/20 bg-primary-fadded text-primary-fadded-content'
                      : 'border-base-300 bg-base-200/60'
                  }`}
                  style={{
                    gap: 'var(--space-3)',
                    paddingBlock: 'var(--space-3)',
                    paddingInline: 'var(--space-3)',
                  }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex size-9 items-center justify-center border border-base-300 bg-base-100"
                      aria-hidden="true"
                    >
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {members.length} member{members.length === 1 ? '' : 's'} indexed
                        </p>
                        {selectedCount > 0 ? (
                          <Chip variant="faded" color="primary" size="sm">
                            {selectedCount} selected
                          </Chip>
                        ) : null}
                      </div>
                      <p
                        className={`text-sm ${
                          selectedCount > 0
                            ? 'text-primary-fadded-content/80'
                            : 'text-base-content/60'
                        }`}
                      >
                        {selectedCount > 0
                          ? 'Selection is ready for reassignment.'
                          : 'Select members from one or more levels to change account access.'}
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

                <div
                  className="flex flex-wrap items-center gap-2 border-b border-base-300"
                  style={{ paddingBottom: 'var(--space-3)' }}
                >
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={handleOpenFilterDialog}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filter
                    {hasActiveFilters ? (
                      <span className="badge badge-primary badge-sm">
                        {selectedTags.length + selectedRanks.length}
                      </span>
                    ) : null}
                  </button>

                  {hasActiveFilters ? (
                    <>
                      {selectedTags.map((tag) => (
                        <button
                          key={`tag-${tag}`}
                          type="button"
                          className="inline-flex"
                          onClick={() => handleToggleTagFilter(tag, false)}
                          aria-label={`Remove ${tag} tag filter`}
                        >
                          <Chip variant="faded" color="primary" size="sm" className="gap-1">
                            {tag}
                            <X className="h-3 w-3" />
                          </Chip>
                        </button>
                      ))}
                      {selectedRanks.map((rank) => (
                        <button
                          key={`rank-${rank}`}
                          type="button"
                          className="inline-flex"
                          onClick={() => handleToggleRankFilter(rank, false)}
                          aria-label={`Remove ${rank} rank filter`}
                        >
                          <Chip variant="faded" color="neutral" size="sm" className="gap-1">
                            {rank}
                            <X className="h-3 w-3" />
                          </Chip>
                        </button>
                      ))}
                      <span className="text-sm text-base-content/60">
                        Filtered to {members.length} matching member
                        {members.length === 1 ? '' : 's'}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-base-content/60">
                      No filters applied. Open Filter to narrow the directory.
                    </span>
                  )}
                </div>
              </AppCardContent>
            </AppCard>

            {groupedMembers.map(({ definition, members: groupMembers }) => {
              const isCollapsed = collapsedLevels[definition.level] ?? false
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
                <div
                  key={definition.level}
                  tabIndex={0}
                  className={`collapse collapse-arrow border border-base-300 bg-base-100 shadow-sm ${
                    isCollapsed ? 'collapse-close' : 'collapse-open'
                  }`}
                >
                  <div
                    className="collapse-title min-h-0 px-4 py-3"
                    onClick={() => handleToggleGroupCollapsed(definition.level)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleToggleGroupCollapsed(definition.level)
                      }
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 pr-6">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold">{definition.label}</p>
                          <Chip variant="faded" color="neutral" size="sm">
                            Level {definition.level}
                          </Chip>
                          {selectedInGroup > 0 ? (
                            <Chip variant="faded" color="primary" size="sm">
                              {selectedInGroup} selected
                            </Chip>
                          ) : null}
                        </div>
                        <p className="truncate text-sm text-base-content/60">
                          {definition.summary}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-base-content/60">
                        <Users className="h-4 w-4" />
                        <span>
                          {groupMembers.length} member{groupMembers.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="collapse-content grid gap-3 px-4 pb-4 pt-0">
                    {!isCollapsed ? (
                      <>
                        <div className="text-sm text-base-content/60">
                          {definition.permissions.join(' ')}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                              className="checkbox"
                              type="checkbox"
                              checked={allSelected}
                              ref={(element) => {
                                if (element) {
                                  element.indeterminate = someSelected
                                }
                              }}
                              onChange={(event) =>
                                handleToggleGroup(selectableGroupMemberIds, event.target.checked)
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
                                      <input
                                        className="checkbox"
                                        type="checkbox"
                                        checked={selection[member.id] === true}
                                        onChange={(event) =>
                                          handleToggleMember(member.id, event.target.checked)
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
                      </>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>

          <div
            className="grid gap-4 xl:sticky"
            style={{ top: 'var(--space-4)', height: 'fit-content' }}
          >
            <AppCard>
              <AppCardHeader>
                <AppCardTitle>Level Guide</AppCardTitle>
                <AppCardDescription>
                  Keep this condensed unless you need a quick permissions reference.
                </AppCardDescription>
              </AppCardHeader>
              <AppCardContent style={{ display: 'grid', gap: 'var(--space-3)' }}>
                <div
                  className="border border-base-300 bg-base-200/40"
                  style={{ padding: 'var(--space-3)' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <BookOpenText className="h-4 w-4 text-info" />
                    </div>
                    <div className="text-sm text-base-content/70">
                      Level guidance is reference-only. The directory and reassignment controls on
                      the left are the working surface.
                    </div>
                  </div>
                </div>

                <div
                  tabIndex={0}
                  className="collapse collapse-arrow border border-base-300 bg-base-100"
                >
                  <div className="collapse-title min-h-0 px-3 py-3 text-sm font-semibold">
                    View all account levels
                  </div>
                  <div className="collapse-content grid gap-2 px-3 pb-3 pt-0">
                    {ACCOUNT_LEVEL_DEFINITIONS.map((definition) => (
                      <details
                        key={definition.level}
                        className="border border-base-300 bg-base-200/30"
                      >
                        <summary
                          className="cursor-pointer list-none"
                          style={{ padding: 'var(--space-3)' }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">{definition.label}</span>
                                <Chip variant="faded" color="neutral" size="sm">
                                  {definition.level}
                                </Chip>
                              </div>
                              <p className="mt-1 text-sm text-base-content/70">
                                {definition.summary}
                              </p>
                            </div>
                          </div>
                        </summary>
                        <div
                          className="border-t border-base-300 text-sm text-base-content/80"
                          style={{ padding: 'var(--space-3)' }}
                        >
                          <ul className="list-disc pl-4">
                            {definition.permissions.map((permission) => (
                              <li key={permission}>{permission}</li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>

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

      <Dialog open={filterDialogOpen} onOpenChange={handleFilterDialogOpenChange}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Refine Directory</DialogTitle>
            <DialogDescription>
              Choose one or more tags and ranks, then apply the filter set to the account-level
              directory.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="flex flex-wrap items-center gap-2">
              {draftTags.length > 0 || draftRanks.length > 0 ? (
                <>
                  {draftTags.map((tag) => (
                    <button
                      key={`draft-tag-${tag}`}
                      type="button"
                      className="inline-flex"
                      onClick={() => handleToggleDraftTagFilter(tag, false)}
                      aria-label={`Remove ${tag} tag filter`}
                    >
                      <Chip variant="faded" color="primary" size="sm" className="gap-1">
                        {tag}
                        <X className="h-3 w-3" />
                      </Chip>
                    </button>
                  ))}
                  {draftRanks.map((rank) => (
                    <button
                      key={`draft-rank-${rank}`}
                      type="button"
                      className="inline-flex"
                      onClick={() => handleToggleDraftRankFilter(rank, false)}
                      aria-label={`Remove ${rank} rank filter`}
                    >
                      <Chip variant="faded" color="neutral" size="sm" className="gap-1">
                        {rank}
                        <X className="h-3 w-3" />
                      </Chip>
                    </button>
                  ))}
                </>
              ) : (
                <span className="text-sm text-base-content/60">No draft filters selected yet.</span>
              )}
            </div>

            <div
              className="grid items-start"
              style={{
                gap: 'var(--space-4)',
                gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
              }}
            >
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Tags</legend>
                <div
                  className="border border-base-300 bg-base-200/30"
                  style={{ padding: 'var(--space-3)' }}
                >
                  <form
                    className="filter flex flex-wrap gap-2"
                    onSubmit={(event) => event.preventDefault()}
                  >
                    {tagOptions.map((tag) => (
                      <input
                        key={tag.id}
                        className="btn btn-xs"
                        type="checkbox"
                        aria-label={tag.name}
                        checked={draftTags.includes(tag.name)}
                        onChange={(event) =>
                          handleToggleDraftTagFilter(tag.name, event.target.checked)
                        }
                      />
                    ))}
                  </form>
                </div>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Ranks</legend>
                <div
                  className="grid border border-base-300 bg-base-200/30"
                  style={{
                    padding: 'var(--space-3)',
                    gap: 'var(--space-2)',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  }}
                >
                  {rankOptions.map((rank) => (
                    <label
                      key={rank.id}
                      className="label cursor-pointer justify-start gap-2 rounded-none px-0 py-1 text-sm"
                    >
                      <input
                        className="checkbox checkbox-xs"
                        type="checkbox"
                        checked={draftRanks.includes(rank.code)}
                        onChange={(event) =>
                          handleToggleDraftRankFilter(rank.code, event.target.checked)
                        }
                      />
                      <span className="font-medium">{rank.code}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleClearDraftFilters}
              disabled={draftTags.length === 0 && draftRanks.length === 0}
            >
              Clear all
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleFilterDialogOpenChange(false)}
            >
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleApplyFilters}>
              Apply
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
