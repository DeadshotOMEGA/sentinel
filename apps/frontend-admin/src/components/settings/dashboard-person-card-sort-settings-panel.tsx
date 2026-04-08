'use client'

import { useMemo, useState } from 'react'
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
import { GripVertical, Plus, Save, X, PencilLine } from 'lucide-react'
import { toast } from 'sonner'
import type { EnumResponse, TagResponse } from '@sentinel/contracts'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
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
  const option = DASHBOARD_SORT_CRITERIA_OPTIONS.find(
    (candidate) => candidate.type === criterion.type
  )
  const selectedTag = allTags.find((tag) => tag.id === criterion.config?.tagId)
  const selectedVisitType = visitTypes.find(
    (visitType) => visitType.id === criterion.config?.visitTypeId
  )
  const isTopLevel = depth === 0
  const isCollapsed = isTopLevel && collapsedCriterionIds.has(criterion.id)
  const canAddChildren = editable && option?.allowChildren && depth === 0
  const showNoteField = depth === 0
  const showSubSorting = depth === 0

  const content = (
    <div className="grid gap-3 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            className={cn(
              'btn btn-ghost btn-sm btn-square',
              !editable && 'pointer-events-none opacity-40'
            )}
            {...sortable.attributes}
            {...sortable.listeners}
            aria-label={`Reorder ${option?.label ?? criterion.type}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div>
            <p className="font-medium">{option?.label ?? criterion.type}</p>
            <p className="text-sm text-base-content/60">{option?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isTopLevel ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => onToggleCollapse(criterion.id)}
            >
              {isCollapsed ? 'Expand' : 'Collapse'}
            </button>
          ) : null}
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
        <>
          {criterion.type === 'specific_tag' || criterion.type === 'visit_type' || showNoteField ? (
            <div
              className={cn(
                'grid gap-3',
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
                  <legend className="fieldset-legend">Note</legend>
                  <textarea
                    className="textarea textarea-sm min-h-20"
                    value={criterion.note}
                    disabled={!editable}
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

          {showSubSorting ? (
            <div className="grid gap-2 border-t border-base-300 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Sub-sorting</p>
                  <p className="text-xs text-base-content/60">
                    Criteria added here sort only cards that matched this row.
                  </p>
                </div>
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

              {criterion.children.length > 0 ? (
                <SortableContext
                  items={criterion.children.map((child) => child.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid gap-2">
                    {criterion.children.map((child) => (
                      <SortableCriterionCard
                        key={child.id}
                        criterion={child}
                        editable={editable}
                        allTags={allTags}
                        visitTypes={visitTypes}
                        depth={depth + 1}
                        collapsedCriterionIds={collapsedCriterionIds}
                        onChange={onChange}
                        onRemove={onRemove}
                        onAddChild={onAddChild}
                        onToggleCollapse={onToggleCollapse}
                      />
                    ))}
                  </div>
                </SortableContext>
              ) : (
                <div className="border border-dashed border-base-300 bg-base-200/40 px-3 py-3 text-sm text-base-content/60">
                  No sub-sorting defined for this criterion.
                </div>
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )

  if (isTopLevel) {
    return (
      <div
        ref={sortable.setNodeRef}
        style={style}
        tabIndex={0}
        className={cn(
          'collapse collapse-arrow border border-base-300 bg-base-100',
          isCollapsed ? 'collapse-close' : 'collapse-open'
        )}
      >
        <div className="collapse-title min-h-0 px-0 py-0">{content}</div>
      </div>
    )
  }

  return (
    <div ref={sortable.setNodeRef} style={style} className="border border-base-300 bg-base-100">
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

  const toggleCriterionCollapsed = (criterionId: string) => {
    setCollapsedCriterionIds((current) =>
      current.includes(criterionId)
        ? current.filter((id) => id !== criterionId)
        : [...current, criterionId]
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <AppCard className="self-start">
        <AppCardHeader>
          <AppCardTitle>Criteria Library</AppCardTitle>
          <AppCardDescription>
            Add criteria to the dashboard order. Rank preview:{' '}
            {rankPreview || 'No rank data loaded'}.
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent className="grid gap-3">
          {DASHBOARD_SORT_CRITERIA_OPTIONS.map((option) => (
            <div key={option.type} className="border border-base-300 bg-base-200/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{option.label}</p>
                  <p className="text-sm text-base-content/60">{option.description}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => addTopLevelCriterion(option.type)}
                  disabled={!isEditing}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </div>
          ))}
        </AppCardContent>
      </AppCard>

      <AppCard className="self-start">
        <AppCardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <AppCardTitle>Dashboard Card Sorting</AppCardTitle>
              <AppCardDescription>
                Drag criteria into order, add notes, and nest sub-sorts inside grouping criteria.
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
          <div className="flex flex-wrap items-center gap-2 text-sm text-base-content/65">
            <span className="badge badge-ghost badge-sm">Grouping rule</span>
            <span>
              Bucket criteria create groups, and child criteria sort only within that parent row.
            </span>
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
                  activeConfig.criteria.map((criterion) => (
                    <SortableCriterionCard
                      key={criterion.id}
                      criterion={criterion}
                      editable={isEditing}
                      allTags={nonPositionalTags}
                      visitTypes={visitTypes}
                      depth={0}
                      collapsedCriterionIds={collapsedCriterionIdSet}
                      onChange={updateDraftCriterion}
                      onRemove={(criterionId) =>
                        setDraft((current) => ({
                          ...current,
                          criteria: removeCriterion(current.criteria, criterionId),
                        }))
                      }
                      onAddChild={addChildCriterion}
                      onToggleCollapse={toggleCriterionCollapsed}
                    />
                  ))
                ) : (
                  <div className="border border-dashed border-base-300 bg-base-200/30 px-4 py-8 text-center text-base-content/60">
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
