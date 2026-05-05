'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Layers,
  PencilLine,
  Plus,
  Save,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { EnumResponse, TagResponse } from '@sentinel/contracts'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { Chip, type ChipColor, type ChipVariant } from '@/components/ui/chip'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import {
  useDashboardPersonCardSort,
  useSaveDashboardPersonCardSort,
} from '@/hooks/use-dashboard-person-card-sort'
import { useTags } from '@/hooks/use-member-tags'
import { useEnums } from '@/hooks/use-enums'
import { apiClient } from '@/lib/api-client'
import {
  DASHBOARD_SORT_CRITERIA_OPTIONS,
  DEFAULT_DASHBOARD_PERSON_CARD_SORT,
  type DashboardPersonCardSortConfig,
  type DashboardSortCriterion,
  type DashboardSortCriterionType,
} from '@/lib/dashboard-person-card-sort'
import { cn } from '@/lib/utils'

type DashboardSortCriterionOption = (typeof DASHBOARD_SORT_CRITERIA_OPTIONS)[number]
type CriterionLibraryCategory = 'grouping' | 'sorting' | 'special'

const VISITOR_OR_SPECIAL_CRITERIA = new Set<DashboardSortCriterionType>([
  'active_dds',
  'scheduled_dds',
  'scheduled_duty_watch',
  'visitor',
  'visit_type',
])

const STANDARD_WITHIN_GROUP_SORT_TYPES = [
  'rank',
  'last_name',
  'first_name',
] as const satisfies readonly DashboardSortCriterionType[]

const CRITERION_LIBRARY_SECTIONS: Array<{
  category: CriterionLibraryCategory
  title: string
  description: string
}> = [
  {
    category: 'grouping',
    title: 'Grouping rules',
    description: 'Create dashboard groups and can sort cards within each group.',
  },
  {
    category: 'sorting',
    title: 'Sorting rules',
    description: 'Order cards without creating a separate dashboard group.',
  },
  {
    category: 'special',
    title: 'Visitor / special rules',
    description: 'Handle visitor cards, duty roles, and daily responsibility groups.',
  },
]

function getCriterionOption(type: DashboardSortCriterionType): DashboardSortCriterionOption | null {
  return DASHBOARD_SORT_CRITERIA_OPTIONS.find((candidate) => candidate.type === type) ?? null
}

function getCriterionLibraryCategory(
  option: DashboardSortCriterionOption
): CriterionLibraryCategory {
  if (VISITOR_OR_SPECIAL_CRITERIA.has(option.type)) {
    return 'special'
  }

  return option.allowChildren ? 'grouping' : 'sorting'
}

function getCriterionCapabilityLabel(option: DashboardSortCriterionOption): string {
  const category = getCriterionLibraryCategory(option)

  if (category === 'special') {
    return 'Special'
  }

  return option.allowChildren ? 'Can group' : 'Sort only'
}

function hasStandardWithinGroupSort(children: DashboardSortCriterion[]): boolean {
  return (
    children.length === STANDARD_WITHIN_GROUP_SORT_TYPES.length &&
    STANDARD_WITHIN_GROUP_SORT_TYPES.every((type, index) => children[index]?.type === type)
  )
}

function getConfiguredValueLabel(input: {
  criterion: DashboardSortCriterion
  selectedTag: TagResponse | undefined
  selectedVisitType: EnumResponse | undefined
}): string | null {
  const { criterion, selectedTag, selectedVisitType } = input

  if (criterion.type === 'specific_tag') {
    return selectedTag?.name ?? 'No tag selected'
  }

  if (criterion.type === 'visit_type') {
    return selectedVisitType?.name ?? 'unavailable'
  }

  return null
}

function getCriterionDisplayName(input: {
  criterion: DashboardSortCriterion
  option: DashboardSortCriterionOption | null
  selectedTag: TagResponse | undefined
  selectedVisitType: EnumResponse | undefined
}): string {
  const configuredValue = getConfiguredValueLabel(input)
  const label = input.option?.label ?? input.criterion.type

  return configuredValue ? `${label}: ${configuredValue}` : label
}

function getSortRuleLabel(
  criterion: DashboardSortCriterion,
  allTags: TagResponse[],
  visitTypes: EnumResponse[]
): string {
  return getCriterionDisplayName({
    criterion,
    option: getCriterionOption(criterion.type),
    selectedTag: allTags.find((tag) => tag.id === criterion.config?.tagId),
    selectedVisitType: visitTypes.find(
      (visitType) => visitType.id === criterion.config?.visitTypeId
    ),
  })
}

function getChildSortReviewDescription(
  criterion: DashboardSortCriterion,
  option: DashboardSortCriterionOption | null,
  position: number | undefined
): string {
  const prefix = position && position > 1 ? 'Then sorts' : 'Sorts'

  switch (criterion.type) {
    case 'rank':
      return `${prefix} matching cards by rank seniority from highest to lowest.`
    case 'last_name':
      return `${prefix} matching cards alphabetically by last name.`
    case 'first_name':
      return `${prefix} matching cards alphabetically by first name.`
    case 'department':
      return `${prefix} matching cards alphabetically by division or department.`
    case 'specific_tag':
      return `${prefix} matching cards by the selected tag.`
    case 'visit_type':
      return `${prefix} matching visitor cards by the selected visit type.`
    default:
      return option?.description ?? `${prefix} matching cards with this rule.`
  }
}

function buildSortSequence(input: {
  criteria: DashboardSortCriterion[]
  allTags: TagResponse[]
  visitTypes: EnumResponse[]
}): string[] {
  return input.criteria.map((criterion) =>
    getSortRuleLabel(criterion, input.allTags, input.visitTypes)
  )
}

function buildDashboardOrderSteps(input: {
  criteria: DashboardSortCriterion[]
  allTags: TagResponse[]
  visitTypes: EnumResponse[]
}): string[] {
  return input.criteria
    .filter((criterion) => getCriterionOption(criterion.type)?.allowChildren)
    .map((criterion) => getSortRuleLabel(criterion, input.allTags, input.visitTypes))
}

function renderConfiguredValue(input: {
  criterion: DashboardSortCriterion
  selectedTag: TagResponse | undefined
  selectedVisitType: EnumResponse | undefined
}) {
  const { criterion, selectedTag, selectedVisitType } = input

  if (criterion.type === 'specific_tag') {
    if (!selectedTag) {
      return <span className="text-xs font-medium text-base-content/55">No tag selected</span>
    }

    return (
      <Chip
        size="sm"
        variant="faded"
        color={(selectedTag.chipColor as ChipColor) || 'default'}
        className="chip-enhanced"
      >
        {selectedTag.name}
      </Chip>
    )
  }

  if (criterion.type === 'visit_type') {
    if (!selectedVisitType) {
      return (
        <span className="text-xs font-medium text-base-content/55">Visit type unavailable</span>
      )
    }

    return (
      <Chip
        size="sm"
        variant={(selectedVisitType.chipVariant as ChipVariant) || 'faded'}
        color={(selectedVisitType.chipColor as ChipColor) || 'default'}
        className="chip-enhanced"
      >
        {selectedVisitType.name}
      </Chip>
    )
  }

  return null
}

function CriterionSummaryMeta({
  criterion,
  selectedTag,
  selectedVisitType,
}: {
  criterion: DashboardSortCriterion
  selectedTag: TagResponse | undefined
  selectedVisitType: EnumResponse | undefined
}) {
  const configuredValue = renderConfiguredValue({ criterion, selectedTag, selectedVisitType })
  const hasNote = criterion.note.trim().length > 0
  const metadataParts = [
    criterion.children.length > 0
      ? `${criterion.children.length} ${criterion.children.length === 1 ? 'Rule' : 'Rules'} within`
      : null,
    hasNote ? 'Note' : null,
  ].filter((part): part is string => part !== null)

  if (!configuredValue && criterion.children.length === 0 && !hasNote) {
    return null
  }

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">{configuredValue}</div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2 text-xs font-medium text-base-content/55">
        {metadataParts.length > 0 ? <span>{metadataParts.join(' + ')}</span> : null}
      </div>
    </div>
  )
}

function createCriterionId(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID()
  }

  return `dashboard-sort-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function cloneDashboardSortConfig(
  config: DashboardPersonCardSortConfig
): DashboardPersonCardSortConfig {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(config)
  }

  return JSON.parse(JSON.stringify(config)) as DashboardPersonCardSortConfig
}

function createCriterion(type: DashboardSortCriterionType): DashboardSortCriterion {
  return {
    id: createCriterionId(),
    type,
    note: '',
    children: [],
  }
}

function updateCriterionTree(
  criteria: DashboardSortCriterion[],
  criterionId: string,
  updater: (criterion: DashboardSortCriterion) => DashboardSortCriterion
): DashboardSortCriterion[] {
  return criteria.map((criterion) => {
    if (criterion.id === criterionId) {
      return updater(criterion)
    }

    if (criterion.children.length === 0) {
      return criterion
    }

    return {
      ...criterion,
      children: updateCriterionTree(criterion.children, criterionId, updater),
    }
  })
}

function removeCriterion(
  criteria: DashboardSortCriterion[],
  criterionId: string
): DashboardSortCriterion[] {
  return criteria
    .filter((criterion) => criterion.id !== criterionId)
    .map((criterion) => ({
      ...criterion,
      children: removeCriterion(criterion.children, criterionId),
    }))
}

function reorderCriteria(
  criteria: DashboardSortCriterion[],
  activeId: string,
  overId: string
): DashboardSortCriterion[] {
  const oldIndex = criteria.findIndex((criterion) => criterion.id === activeId)
  const newIndex = criteria.findIndex((criterion) => criterion.id === overId)

  if (oldIndex !== -1 && newIndex !== -1) {
    return arrayMove(criteria, oldIndex, newIndex)
  }

  return criteria.map((criterion) => ({
    ...criterion,
    children: reorderCriteria(criterion.children, activeId, overId),
  }))
}

function useVisitTypes() {
  return useDashboardSortQuery({
    queryKey: ['settings-visit-types'],
    queryFn: async () => {
      const response = await apiClient.enums.visitTypes.getVisitTypes()
      if (response.status !== 200) {
        throw new Error('Failed to fetch visit types')
      }
      return response.body.visitTypes
    },
  })
}

function useDashboardSortQuery<T>(options: {
  queryKey: readonly string[]
  queryFn: () => Promise<T>
}) {
  return useQuery({
    queryKey: options.queryKey,
    queryFn: options.queryFn,
    staleTime: 10 * 60 * 1000,
  })
}

function SortableCriterionCard({
  criterion,
  editable,
  allTags,
  visitTypes,
  depth,
  position,
  collapsedCriterionIds,
  onChange,
  onRemove,
  onAddChild,
  onToggleCollapse,
}: {
  criterion: DashboardSortCriterion
  editable: boolean
  allTags: TagResponse[]
  visitTypes: EnumResponse[]
  depth: number
  position?: number
  collapsedCriterionIds: Set<string>
  onChange: (
    criterionId: string,
    updater: (criterion: DashboardSortCriterion) => DashboardSortCriterion
  ) => void
  onRemove: (criterionId: string) => void
  onAddChild: (criterionId: string, type: DashboardSortCriterionType) => void
  onToggleCollapse: (criterionId: string) => void
}) {
  const sortable = useSortable({ id: criterion.id, disabled: !editable })
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  }
  const option = getCriterionOption(criterion.type)
  const selectedTag = allTags.find((tag) => tag.id === criterion.config?.tagId)
  const selectedVisitType = visitTypes.find(
    (visitType) => visitType.id === criterion.config?.visitTypeId
  )
  const isTopLevel = depth === 0
  const isCollapsed = isTopLevel && collapsedCriterionIds.has(criterion.id)
  const canAddChildren = editable && option?.allowChildren && depth === 0
  const showNoteField = depth === 0
  const showSubSorting = depth === 0
  const displayName = getCriterionDisplayName({
    criterion,
    option,
    selectedTag,
    selectedVisitType,
  })
  const configuredValue = renderConfiguredValue({ criterion, selectedTag, selectedVisitType })
  const note = criterion.note.trim()
  const isGroupingRule = Boolean(option?.allowChildren)
  const contentId = `${criterion.id}-dashboard-sort-content`
  const sortSequence = buildSortSequence({ criteria: criterion.children, allTags, visitTypes })
  const usesStandardWithinGroupSort = hasStandardWithinGroupSort(criterion.children)
  const canToggleStandardWithinGroupSort =
    editable && (criterion.children.length === 0 || usesStandardWithinGroupSort)

  if (!isTopLevel) {
    return (
      <div
        ref={sortable.setNodeRef}
        style={style}
        className="border-t border-base-300/70 first:border-t-0"
      >
        <div className="flex items-start gap-(--space-3) px-(--space-3) py-(--space-2)">
          {typeof position === 'number' ? (
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-box bg-base-200/65 text-xs font-bold text-base-content/60"
              aria-hidden="true"
            >
              {position}
            </span>
          ) : null}
          {editable ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square mt-0.5 shrink-0"
              {...sortable.attributes}
              {...sortable.listeners}
              aria-label={`Reorder ${displayName}`}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-(--space-2)">
              <p className="text-sm font-semibold leading-tight text-base-content">{displayName}</p>
              {configuredValue}
            </div>
            <p className="mt-0.5 text-xs leading-snug text-base-content/62">
              {editable
                ? (option?.description ?? criterion.type)
                : getChildSortReviewDescription(criterion, option, position)}
            </p>

            {editable && (criterion.type === 'specific_tag' || criterion.type === 'visit_type') ? (
              <div className="mt-(--space-2) grid gap-(--space-2) xl:max-w-sm">
                {criterion.type === 'specific_tag' ? (
                  <select
                    className="select select-sm"
                    value={criterion.config?.tagId ?? ''}
                    onChange={(event) =>
                      onChange(criterion.id, (current) => ({
                        ...current,
                        config: {
                          ...current.config,
                          tagId: event.target.value || undefined,
                        },
                      }))
                    }
                  >
                    <option value="">Select tag</option>
                    {allTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                ) : null}

                {criterion.type === 'visit_type' ? (
                  <select
                    className="select select-sm"
                    value={criterion.config?.visitTypeId ?? ''}
                    onChange={(event) =>
                      onChange(criterion.id, (current) => ({
                        ...current,
                        config: {
                          ...current.config,
                          visitTypeId: event.target.value || undefined,
                        },
                      }))
                    }
                  >
                    <option value="">Select visit type</option>
                    {visitTypes.map((visitType) => (
                      <option key={visitType.id} value={visitType.id}>
                        {visitType.name}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            ) : null}
          </div>
          {editable ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs shrink-0 text-error"
              onClick={() => onRemove(criterion.id)}
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  const content = (
    <div className="grid gap-3 p-(--space-3)">
      <div className="flex flex-wrap items-start justify-between gap-(--space-3)">
        <div className="flex min-w-0 flex-1 items-start gap-(--space-3)">
          {isTopLevel && typeof position === 'number' ? (
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-box border text-sm font-bold',
                isGroupingRule
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-base-300 bg-base-200/65 text-base-content/65'
              )}
              aria-hidden="true"
            >
              {position}
            </span>
          ) : null}
          {editable ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square shrink-0"
              {...sortable.attributes}
              {...sortable.listeners}
              aria-label={`Reorder ${displayName}`}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : null}
          {isTopLevel ? (
            <button
              type="button"
              className="group grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-start gap-(--space-3) rounded-box text-left transition-colors duration-(--duration-fast) hover:bg-base-200/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={() => onToggleCollapse(criterion.id)}
              aria-controls={contentId}
              aria-expanded={!isCollapsed}
              aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${displayName} rule`}
            >
              <span className="min-w-0 p-(--space-2)">
                <span className="block font-semibold leading-tight text-base-content">
                  {displayName}
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-base-content/62">
                  {option?.description ?? criterion.type}
                </span>
                <span className="mt-(--space-2) block">
                  <CriterionSummaryMeta
                    criterion={criterion}
                    selectedTag={selectedTag}
                    selectedVisitType={selectedVisitType}
                  />
                </span>
              </span>
              <span className="flex h-8 w-8 items-center justify-center p-(--space-2) text-base-content/55 group-hover:text-base-content">
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </span>
            </button>
          ) : (
            <div className="min-w-0">
              <p className="font-semibold leading-tight text-base-content">{displayName}</p>
              <p className="mt-0.5 text-sm leading-snug text-base-content/62">
                {option?.description ?? criterion.type}
              </p>
              <div className="mt-(--space-2)">
                <CriterionSummaryMeta
                  criterion={criterion}
                  selectedTag={selectedTag}
                  selectedVisitType={selectedVisitType}
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editable ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm text-error"
              onClick={() => onRemove(criterion.id)}
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {!isCollapsed ? (
        <div id={contentId} className="grid gap-(--space-3)">
          {!editable && note ? (
            <div className="grid gap-(--space-2) rounded-box bg-base-200/45 p-(--space-3)">
              <div className="rounded-box border border-success/20 bg-success/10 px-(--space-3) py-(--space-2)">
                <p className="text-xs font-semibold uppercase tracking-wide text-base-content/45">
                  Note
                </p>
                <p className="mt-1 text-sm leading-relaxed text-base-content/75">{note}</p>
              </div>
            </div>
          ) : null}

          {editable &&
          (criterion.type === 'specific_tag' ||
            criterion.type === 'visit_type' ||
            showNoteField) ? (
            <div
              className={cn(
                'grid gap-(--space-3) rounded-box border border-base-300 bg-base-200/45 p-(--space-3)',
                showNoteField ? 'xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]' : 'xl:grid-cols-1'
              )}
            >
              {criterion.type === 'specific_tag' ? (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Tag</legend>
                  <select
                    className="select select-sm"
                    value={criterion.config?.tagId ?? ''}
                    disabled={!editable}
                    onChange={(event) =>
                      onChange(criterion.id, (current) => ({
                        ...current,
                        config: {
                          ...current.config,
                          tagId: event.target.value || undefined,
                        },
                      }))
                    }
                  >
                    <option value="">Select tag</option>
                    {allTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                  {!editable && selectedTag ? (
                    <p className="text-xs text-base-content/60">{selectedTag.name}</p>
                  ) : null}
                </fieldset>
              ) : null}

              {criterion.type === 'visit_type' ? (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Visit Type</legend>
                  <select
                    className="select select-sm"
                    value={criterion.config?.visitTypeId ?? ''}
                    disabled={!editable}
                    onChange={(event) =>
                      onChange(criterion.id, (current) => ({
                        ...current,
                        config: {
                          ...current.config,
                          visitTypeId: event.target.value || undefined,
                        },
                      }))
                    }
                  >
                    <option value="">Select visit type</option>
                    {visitTypes.map((visitType) => (
                      <option key={visitType.id} value={visitType.id}>
                        {visitType.name}
                      </option>
                    ))}
                  </select>
                  {!editable && selectedVisitType ? (
                    <p className="text-xs text-base-content/60">{selectedVisitType.name}</p>
                  ) : null}
                </fieldset>
              ) : null}

              {showNoteField ? (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Optional note</legend>
                  <textarea
                    className="textarea textarea-sm min-h-20"
                    value={criterion.note}
                    onChange={(event) =>
                      onChange(criterion.id, (current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    placeholder="Explain why this criterion appears here..."
                  />
                </fieldset>
              ) : null}
            </div>
          ) : null}

          {showSubSorting && (editable || criterion.children.length > 0) ? (
            <div className="ml-(--space-6) grid gap-(--space-3) rounded-box border border-l-2 border-base-300 border-l-primary/40 bg-base-200/65 p-(--space-3)">
              <div className="flex flex-wrap items-center justify-between gap-(--space-2)">
                <div>
                  <p className="text-sm font-semibold">Sort cards within this group</p>
                  <p className="text-xs text-base-content/60">
                    These rules decide the order of cards after they match {displayName}.
                  </p>
                  {sortSequence.length > 0 ? (
                    <p className="mt-(--space-2) text-xs font-semibold text-base-content/70">
                      Sort sequence: {sortSequence.join(' → ')}
                    </p>
                  ) : null}
                </div>
                {editable ? (
                  <div className="flex flex-wrap items-center justify-end gap-(--space-2)">
                    <label
                      className={cn(
                        'flex items-center gap-(--space-2) rounded-box bg-base-100 px-(--space-3) py-(--space-2) text-xs font-semibold text-base-content/75',
                        !canToggleStandardWithinGroupSort && 'opacity-55'
                      )}
                      title={
                        canToggleStandardWithinGroupSort
                          ? 'Enable the standard within-group sort order'
                          : 'Remove custom within-group rules before applying the standard sequence'
                      }
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={usesStandardWithinGroupSort}
                        disabled={!canToggleStandardWithinGroupSort}
                        onChange={(event) => {
                          const checked = event.target.checked
                          onChange(criterion.id, (current) => ({
                            ...current,
                            children: checked
                              ? STANDARD_WITHIN_GROUP_SORT_TYPES.map((type) =>
                                  createCriterion(type)
                                )
                              : hasStandardWithinGroupSort(current.children)
                                ? []
                                : current.children,
                          }))
                        }}
                      />
                      Rank → Last Name → First Name
                    </label>
                    {canAddChildren ? (
                      <select
                        className="select select-sm"
                        defaultValue=""
                        onChange={(event) => {
                          const value = event.target.value as DashboardSortCriterionType
                          if (value) {
                            onAddChild(criterion.id, value)
                            event.target.value = ''
                          }
                        }}
                      >
                        <option value="">Add sub-sort</option>
                        {DASHBOARD_SORT_CRITERIA_OPTIONS.filter(
                          (candidate) => candidate.type !== criterion.type
                        ).map((candidate) => (
                          <option key={candidate.type} value={candidate.type}>
                            {candidate.label}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {criterion.children.length > 0 ? (
                <SortableContext
                  items={criterion.children.map((child) => child.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid gap-2">
                    {criterion.children.map((child, index) => (
                      <SortableCriterionCard
                        key={child.id}
                        criterion={child}
                        editable={editable}
                        allTags={allTags}
                        visitTypes={visitTypes}
                        depth={depth + 1}
                        position={index + 1}
                        collapsedCriterionIds={collapsedCriterionIds}
                        onChange={onChange}
                        onRemove={onRemove}
                        onAddChild={onAddChild}
                        onToggleCollapse={onToggleCollapse}
                      />
                    ))}
                  </div>
                </SortableContext>
              ) : editable ? (
                <div className="border border-dashed border-base-300 bg-base-100 px-(--space-3) py-(--space-3) text-sm text-base-content/60">
                  No within-group sorting has been added yet.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  if (isTopLevel) {
    return (
      <div
        ref={sortable.setNodeRef}
        style={style}
        className={cn(
          'border border-base-300 bg-base-100 shadow-[var(--shadow-1)]',
          isGroupingRule && 'border-l-4 border-l-primary',
          isCollapsed ? 'bg-base-100' : 'bg-base-100'
        )}
      >
        {content}
      </div>
    )
  }

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className="border border-base-300 bg-base-100 shadow-[var(--shadow-1)]"
    >
      {content}
    </div>
  )
}

export function DashboardPersonCardSortSettingsPanel() {
  const { data: config, isLoading, isError, error } = useDashboardPersonCardSort()
  const saveConfig = useSaveDashboardPersonCardSort()
  const { data: tags = [] } = useTags()
  const { data: enums } = useEnums()
  const visitTypesQuery = useVisitTypes()
  const [draft, setDraft] = useState<DashboardPersonCardSortConfig>(
    DEFAULT_DASHBOARD_PERSON_CARD_SORT
  )
  const [isEditing, setIsEditing] = useState(false)
  const [collapsedCriterionIds, setCollapsedCriterionIds] = useState<string[]>([])
  const [hasInitializedCollapsedState, setHasInitializedCollapsedState] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const nonPositionalTags = useMemo(
    () =>
      tags
        .filter((tag) => !tag.isPositional)
        .sort((left, right) => (left.displayOrder ?? 0) - (right.displayOrder ?? 0)),
    [tags]
  )

  const visitTypes = useMemo(
    () =>
      [...(visitTypesQuery.data ?? [])].sort((left, right) => left.name.localeCompare(right.name)),
    [visitTypesQuery.data]
  )

  const rankPreview = useMemo(() => {
    return [...(enums?.rankDetails ?? [])]
      .sort((left, right) => right.displayOrder - left.displayOrder)
      .slice(0, 4)
      .map((rank) => rank.code)
      .join(' -> ')
  }, [enums?.rankDetails])

  const effectiveConfig = config ?? DEFAULT_DASHBOARD_PERSON_CARD_SORT
  const collapsedCriterionIdSet = useMemo(
    () => new Set(collapsedCriterionIds),
    [collapsedCriterionIds]
  )

  useEffect(() => {
    if (hasInitializedCollapsedState || isLoading || isError) {
      return
    }

    setCollapsedCriterionIds(effectiveConfig.criteria.map((criterion) => criterion.id))
    setHasInitializedCollapsedState(true)
  }, [effectiveConfig.criteria, hasInitializedCollapsedState, isError, isLoading])

  const beginEdit = () => {
    setDraft(cloneDashboardSortConfig(effectiveConfig))
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setDraft(cloneDashboardSortConfig(effectiveConfig))
    setIsEditing(false)
  }

  const handleSave = async () => {
    try {
      await saveConfig.mutateAsync(draft)
      setIsEditing(false)
      toast.success('Dashboard card sort saved')
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error ? mutationError.message : 'Failed to save card sort'
      )
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    setDraft((current) => ({
      ...current,
      criteria: reorderCriteria(current.criteria, String(active.id), String(over.id)),
    }))
  }

  const updateDraftCriterion = (
    criterionId: string,
    updater: (criterion: DashboardSortCriterion) => DashboardSortCriterion
  ) => {
    setDraft((current) => ({
      ...current,
      criteria: updateCriterionTree(current.criteria, criterionId, updater),
    }))
  }

  const addTopLevelCriterion = (type: DashboardSortCriterionType) => {
    const nextCriterion = createCriterion(type)
    if (type === 'specific_tag' && nonPositionalTags[0]) {
      nextCriterion.config = { tagId: nonPositionalTags[0].id }
    }
    if (type === 'visit_type' && visitTypes[0]) {
      nextCriterion.config = { visitTypeId: visitTypes[0].id }
    }

    setDraft((current) => ({
      ...current,
      criteria: [...current.criteria, nextCriterion],
    }))
  }

  const addChildCriterion = (parentId: string, type: DashboardSortCriterionType) => {
    const nextCriterion = createCriterion(type)
    if (type === 'specific_tag' && nonPositionalTags[0]) {
      nextCriterion.config = { tagId: nonPositionalTags[0].id }
    }
    if (type === 'visit_type' && visitTypes[0]) {
      nextCriterion.config = { visitTypeId: visitTypes[0].id }
    }

    updateDraftCriterion(parentId, (criterion) => ({
      ...criterion,
      children: [...criterion.children, nextCriterion],
    }))
  }

  if (isLoading) {
    return (
      <AppCard>
        <AppCardContent className="py-10 text-center text-base-content/60">
          Loading card sort settings…
        </AppCardContent>
      </AppCard>
    )
  }

  if (isError) {
    return (
      <AppCard status="error">
        <AppCardHeader>
          <AppCardTitle>Dashboard Card Sorting</AppCardTitle>
          <AppCardDescription>
            {error instanceof Error
              ? error.message
              : 'Failed to load dashboard card sorting settings.'}
          </AppCardDescription>
        </AppCardHeader>
      </AppCard>
    )
  }

  const activeConfig = isEditing ? draft : effectiveConfig
  const dashboardOrderSteps = buildDashboardOrderSteps({
    criteria: activeConfig.criteria,
    allTags: nonPositionalTags,
    visitTypes,
  })
  const groupedCriteriaOptions = CRITERION_LIBRARY_SECTIONS.map((section) => ({
    ...section,
    options: DASHBOARD_SORT_CRITERIA_OPTIONS.filter(
      (option) => getCriterionLibraryCategory(option) === section.category
    ),
  })).filter((section) => section.options.length > 0)
  const activeTopLevelIds = activeConfig.criteria.map((criterion) => criterion.id)
  const topLevelCriterionCount = activeTopLevelIds.length
  const collapsedTopLevelCount = activeTopLevelIds.filter((id) =>
    collapsedCriterionIdSet.has(id)
  ).length
  const allTopLevelCollapsed =
    topLevelCriterionCount > 0 && collapsedTopLevelCount === topLevelCriterionCount
  const allTopLevelExpanded = collapsedTopLevelCount === 0

  const toggleCriterionCollapsed = (criterionId: string) => {
    setCollapsedCriterionIds((current) =>
      current.includes(criterionId)
        ? current.filter((id) => id !== criterionId)
        : [...current, criterionId]
    )
  }

  const expandAllTopLevelCriteria = () => {
    setCollapsedCriterionIds((current) => current.filter((id) => !activeTopLevelIds.includes(id)))
  }

  const collapseAllTopLevelCriteria = () => {
    setCollapsedCriterionIds((current) => {
      const next = new Set(current)
      for (const id of activeTopLevelIds) {
        next.add(id)
      }
      return Array.from(next)
    })
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]">
      <AppCard className="self-start">
        <AppCardHeader>
          <AppCardTitle>Criteria Library</AppCardTitle>
          <AppCardDescription>
            {isEditing
              ? 'Add criteria to the dashboard order.'
              : 'Available rules for the dashboard order.'}{' '}
            Rank preview: {rankPreview || 'No rank data loaded'}.
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent className="grid gap-(--space-4)">
          {groupedCriteriaOptions.map((section) => (
            <section key={section.category} className="grid gap-(--space-2)">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50">
                  {section.title}
                </p>
                <p className="text-xs leading-snug text-base-content/55">{section.description}</p>
              </div>
              <div className="grid gap-(--space-2)">
                {section.options.map((option) => (
                  <div key={option.type} className="border border-base-300 bg-base-200/45">
                    <div className="grid gap-(--space-3) p-(--space-3)">
                      <div className="min-w-0">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-(--space-2)">
                          <p className="text-sm font-semibold leading-tight text-base-content">
                            {option.label}
                          </p>
                          <Chip size="sm" variant="faded" color="neutral">
                            {getCriterionCapabilityLabel(option)}
                          </Chip>
                        </div>
                        <p className="mt-(--space-2) text-sm leading-snug text-base-content/65">
                          {option.description}
                        </p>
                      </div>
                      {isEditing ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline justify-self-start"
                          onClick={() => addTopLevelCriterion(option.type)}
                        >
                          <Plus className="h-4 w-4" />
                          Add
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </AppCardContent>
      </AppCard>

      <AppCard className="self-start">
        <AppCardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <AppCardTitle>Dashboard Card Sorting</AppCardTitle>
              <AppCardDescription>
                {isEditing
                  ? 'Drag criteria into order, add notes, and nest sorting rules inside grouping criteria.'
                  : 'Review the dashboard grouping order and the rules inside each group.'}
              </AppCardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {isEditing ? (
                <>
                  <button type="button" className="btn btn-outline btn-sm" onClick={cancelEdit}>
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSave}
                    disabled={saveConfig.isPending}
                  >
                    {saveConfig.isPending ? <ButtonSpinner /> : <Save className="h-4 w-4" />}
                    Save
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" onClick={beginEdit}>
                  <PencilLine className="h-4 w-4" />
                  Edit
                </button>
              )}
            </div>
          </div>
        </AppCardHeader>
        <AppCardContent className="grid gap-3">
          <div className="grid gap-(--space-3) rounded-box border border-base-300 bg-base-200/45 p-(--space-3)">
            <div className="flex flex-wrap items-start justify-between gap-(--space-3)">
              <div className="flex min-w-0 items-start gap-(--space-2)">
                <Layers className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-base-content">Current dashboard order</p>
                  {dashboardOrderSteps.length > 0 ? (
                    <div className="mt-(--space-2) flex flex-wrap items-center gap-(--space-1)">
                      {dashboardOrderSteps.map((step, index) => (
                        <span
                          key={`${step}-${index}`}
                          className="inline-flex items-center gap-(--space-1)"
                        >
                          {index > 0 ? (
                            <span
                              className="text-xs font-semibold text-base-content/35"
                              aria-hidden="true"
                            >
                              →
                            </span>
                          ) : null}
                          <span className="rounded-box border border-base-300 bg-base-100 px-(--space-2) py-0.5 text-xs font-semibold text-base-content/75 shadow-[var(--shadow-1)]">
                            {step}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-0.5 text-sm leading-snug text-base-content/68">
                      No grouping rules configured.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-(--space-2)">
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={expandAllTopLevelCriteria}
                  disabled={topLevelCriterionCount === 0 || allTopLevelExpanded}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  Expand all
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={collapseAllTopLevelCriteria}
                  disabled={topLevelCriterionCount === 0 || allTopLevelCollapsed}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  Collapse all
                </button>
              </div>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={activeConfig.criteria.map((criterion) => criterion.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid gap-3">
                {activeConfig.criteria.length > 0 ? (
                  activeConfig.criteria.map((criterion, index) => (
                    <SortableCriterionCard
                      key={criterion.id}
                      criterion={criterion}
                      editable={isEditing}
                      allTags={nonPositionalTags}
                      visitTypes={visitTypes}
                      depth={0}
                      position={index + 1}
                      collapsedCriterionIds={collapsedCriterionIdSet}
                      onChange={updateDraftCriterion}
                      onRemove={(criterionId) => {
                        setDraft((current) => ({
                          ...current,
                          criteria: removeCriterion(current.criteria, criterionId),
                        }))
                        setCollapsedCriterionIds((current) =>
                          current.filter((id) => id !== criterionId)
                        )
                      }}
                      onAddChild={addChildCriterion}
                      onToggleCollapse={toggleCriterionCollapsed}
                    />
                  ))
                ) : (
                  <div className="border border-dashed border-base-300 bg-base-200/45 px-4 py-8 text-center text-base-content/60">
                    No criteria configured yet. Add one from the sidebar, then save to apply it on
                    the dashboard.
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </AppCardContent>
      </AppCard>
    </div>
  )
}
