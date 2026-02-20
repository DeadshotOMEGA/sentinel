'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ClipboardList,
  ShieldCheck,
  Pencil,
  Save,
  X,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AppCard,
  AppCardAction,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { AppBadge } from '@/components/ui/AppBadge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useDdsPageContent } from '@/hooks/use-dds-page-content'
import { AccountLevel, useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import { cloneDdsPageContent, parseDdsPageContent, type DdsPageContent } from '@/lib/dds-content'
import { formatDateISO } from '@/lib/date-utils'

const CHECKOFF_STORAGE_PREFIX = 'dds.checkoff.v1'

type TaskCheckoffMap = Record<string, boolean>

function getTaskKey(blockId: string, taskIndex: number): string {
  return `${blockId}:${taskIndex}`
}

function normalizeMultiline(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function toMultiline(values: string[]): string {
  return values.join('\n')
}

function parseStoredCheckoff(value: string | null): TaskCheckoffMap {
  if (!value) return {}

  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    return Object.entries(parsed).reduce<TaskCheckoffMap>((acc, [key, rawValue]) => {
      acc[key] = rawValue === true
      return acc
    }, {})
  } catch {
    return {}
  }
}

function formatUpdatedAt(value: string | null): string {
  if (!value) return 'Not yet saved'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString()
}

const templateSourceConfig: Record<
  'remote' | 'default' | 'invalid-fallback',
  { label: string; status: 'success' | 'warning' | 'info' }
> = {
  remote: { label: 'Live template', status: 'success' },
  default: { label: 'Default template', status: 'info' },
  'invalid-fallback': { label: 'Fallback to default', status: 'warning' },
}

export default function DdsPage() {
  const todayIso = useMemo(() => formatDateISO(new Date()), [])
  const member = useAuthStore((state) => state.member)
  const hasMinimumLevel = useAuthStore((state) => state.hasMinimumLevel)
  const canEditTemplate = hasMinimumLevel(AccountLevel.ADMIN)
  const memberStorageId = member?.id ?? 'anonymous'
  const checkoffStorageKey = `${CHECKOFF_STORAGE_PREFIX}.${memberStorageId}.${todayIso}`

  const { data, isLoading, isError, error, saveTemplateMutation } = useDdsPageContent()

  const [checkoffMap, setCheckoffMap] = useState<TaskCheckoffMap>({})
  const [isCheckoffHydrated, setIsCheckoffHydrated] = useState(false)
  const [isEditingTemplate, setIsEditingTemplate] = useState(false)
  const [draftTemplate, setDraftTemplate] = useState<DdsPageContent | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setCheckoffMap(parseStoredCheckoff(window.localStorage.getItem(checkoffStorageKey)))
    setIsCheckoffHydrated(true)
  }, [checkoffStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isCheckoffHydrated) return
    window.localStorage.setItem(checkoffStorageKey, JSON.stringify(checkoffMap))
  }, [checkoffMap, checkoffStorageKey, isCheckoffHydrated])

  const currentTemplate = data?.content ?? null
  const activeTemplate = isEditingTemplate ? draftTemplate : currentTemplate

  const totalChecklistTasks = useMemo(() => {
    if (!currentTemplate) return 0
    return currentTemplate.checklistBlocks.reduce((acc, block) => acc + block.tasks.length, 0)
  }, [currentTemplate])

  const completedChecklistTasks = useMemo(() => {
    if (!currentTemplate) return 0

    return currentTemplate.checklistBlocks.reduce((count, block) => {
      const completedInBlock = block.tasks.reduce((taskCount, _task, index) => {
        const taskKey = getTaskKey(block.id, index)
        return taskCount + (checkoffMap[taskKey] ? 1 : 0)
      }, 0)
      return count + completedInBlock
    }, 0)
  }, [checkoffMap, currentTemplate])

  const completionPercent =
    totalChecklistTasks > 0 ? Math.round((completedChecklistTasks / totalChecklistTasks) * 100) : 0

  const updateDraft = (updater: (current: DdsPageContent) => DdsPageContent) => {
    setDraftTemplate((current) => {
      if (!current) return current
      return updater(current)
    })
  }

  const handleStartEditing = () => {
    if (!currentTemplate) return
    setDraftTemplate(cloneDdsPageContent(currentTemplate))
    setIsEditingTemplate(true)
  }

  const handleCancelEditing = () => {
    setDraftTemplate(null)
    setIsEditingTemplate(false)
  }

  const handleSaveTemplate = async () => {
    if (!draftTemplate) return

    const parsedDraft = parseDdsPageContent(draftTemplate)
    if (!parsedDraft) {
      toast.error('Template data is invalid. Review section titles and task text.')
      return
    }

    try {
      await saveTemplateMutation.mutateAsync(parsedDraft)
      toast.success('DDS template saved')
      setDraftTemplate(null)
      setIsEditingTemplate(false)
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save template'
      toast.error(message)
    }
  }

  const handleToggleTask = (blockId: string, taskIndex: number) => {
    if (isEditingTemplate) return
    const taskKey = getTaskKey(blockId, taskIndex)
    setCheckoffMap((current) => ({
      ...current,
      [taskKey]: !current[taskKey],
    }))
  }

  const handleResetChecklist = () => {
    setCheckoffMap({})
    toast.success('Checklist reset for today')
  }

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <AppCard>
          <AppCardContent
            className="flex items-center justify-center"
            style={{ minHeight: '180px' }}
          >
            <LoadingSpinner size="lg" />
          </AppCardContent>
        </AppCard>
      </div>
    )
  }

  if (isError || !currentTemplate || !activeTemplate) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <AppCard status="error">
          <AppCardHeader>
            <AppCardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              DDS Operations
            </AppCardTitle>
            <AppCardDescription>
              Failed to load DDS page content. Confirm backend session and settings API access.
            </AppCardDescription>
          </AppCardHeader>
          <AppCardContent>
            <p className="text-sm text-error">
              {error instanceof Error ? error.message : 'Unknown error loading template'}
            </p>
          </AppCardContent>
        </AppCard>
      </div>
    )
  }

  const templateState = data as NonNullable<typeof data>
  const sourceConfig = templateSourceConfig[templateState.source]

  return (
    <main
      className="mx-auto w-full max-w-[1200px]"
      style={{ display: 'grid', gap: 'var(--space-6)', paddingBottom: 'var(--space-10)' }}
    >
      <AppCard variant="elevated">
        <AppCardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
              <AppCardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                DDS Operations
              </AppCardTitle>
              <AppCardDescription>
                Duty Day Staff responsibilities, handoff expectations, and daily execution
                checklist.
              </AppCardDescription>
              <div className="flex flex-wrap items-center gap-2">
                <AppBadge status={sourceConfig.status}>{sourceConfig.label}</AppBadge>
                <AppBadge status={canEditTemplate ? 'success' : 'info'}>
                  {canEditTemplate ? 'Template editable' : 'View only'}
                </AppBadge>
                <AppBadge status={completionPercent === 100 ? 'success' : 'warning'}>
                  {completedChecklistTasks}/{totalChecklistTasks} tasks complete
                </AppBadge>
              </div>
            </div>

            <AppCardAction className="flex flex-wrap items-center justify-end gap-2">
              {!isEditingTemplate && canEditTemplate && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleStartEditing}
                  data-testid="dds-edit-template-btn"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Template
                </button>
              )}

              {isEditingTemplate && (
                <>
                  <button
                    type="button"
                    className={cn(
                      'btn btn-primary btn-sm',
                      saveTemplateMutation.isPending && 'btn-disabled'
                    )}
                    onClick={handleSaveTemplate}
                    data-testid="dds-save-template-btn"
                  >
                    <Save className="h-4 w-4" />
                    Save Template
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleCancelEditing}
                    disabled={saveTemplateMutation.isPending}
                    data-testid="dds-cancel-template-btn"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </>
              )}

              {!isEditingTemplate && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleResetChecklist}
                  data-testid="dds-reset-checklist-btn"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Today
                </button>
              )}
            </AppCardAction>
          </div>
        </AppCardHeader>

        <AppCardContent>
          <div
            role="alert"
            className="alert alert-info alert-soft alert-vertical sm:alert-horizontal"
            style={{ marginTop: 'var(--space-2)' }}
          >
            <CheckCircle2 className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Template is editable</h3>
              <p className="text-sm">
                Admin/Developer users can update responsibilities and checklist wording when SOP
                text changes.
              </p>
            </div>
            <div className="text-xs text-base-content/70">
              Last updated: {formatUpdatedAt(templateState.updatedAt)}
            </div>
          </div>
        </AppCardContent>
      </AppCard>

      <section
        className="grid items-start"
        style={{
          gap: 'var(--space-6)',
          gridTemplateColumns: 'minmax(0, 1fr)',
        }}
      >
        <div
          className="grid lg:grid-cols-[minmax(0,_1.05fr)_minmax(0,_0.95fr)]"
          style={{ gap: 'var(--space-6)' }}
        >
          <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
            <AppCard>
              <AppCardHeader>
                <AppCardTitle>Responsibilities</AppCardTitle>
                <AppCardDescription>
                  Operational rules and handoff requirements for DDS.
                </AppCardDescription>
              </AppCardHeader>

              <AppCardContent style={{ display: 'grid', gap: 'var(--space-4)' }}>
                {activeTemplate.responsibilitySections.map((section, sectionIndex) => (
                  <section
                    key={section.id}
                    className="border border-base-300 bg-base-100"
                    style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-3)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {isEditingTemplate ? (
                        <input
                          value={section.title}
                          onChange={(event) => {
                            const nextTitle = event.target.value
                            updateDraft((current) => {
                              const nextSections = [...current.responsibilitySections]
                              nextSections[sectionIndex] = {
                                ...nextSections[sectionIndex],
                                title: nextTitle,
                              }
                              return { ...current, responsibilitySections: nextSections }
                            })
                          }}
                          className="input input-bordered w-full"
                          aria-label={`Responsibility section ${sectionIndex + 1} title`}
                        />
                      ) : (
                        <h3 className="font-semibold text-lg">{section.title}</h3>
                      )}

                      {isEditingTemplate && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-error"
                          onClick={() => {
                            updateDraft((current) => ({
                              ...current,
                              responsibilitySections: current.responsibilitySections.filter(
                                (_item, index) => index !== sectionIndex
                              ),
                            }))
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      )}
                    </div>

                    {isEditingTemplate ? (
                      <fieldset className="fieldset">
                        <legend className="fieldset-legend">Items (one per line)</legend>
                        <textarea
                          className="textarea textarea-bordered h-40 w-full"
                          value={toMultiline(section.items)}
                          onChange={(event) => {
                            const nextItems = normalizeMultiline(event.target.value)
                            updateDraft((current) => {
                              const nextSections = [...current.responsibilitySections]
                              nextSections[sectionIndex] = {
                                ...nextSections[sectionIndex],
                                items: nextItems,
                              }
                              return { ...current, responsibilitySections: nextSections }
                            })
                          }}
                        />
                      </fieldset>
                    ) : (
                      <ul
                        className="list-disc pl-5 text-sm"
                        style={{ display: 'grid', gap: 'var(--space-2)' }}
                      >
                        {section.items.map((item) => (
                          <li key={`${section.id}-${item}`}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}

                {isEditingTemplate && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm justify-self-start"
                    onClick={() => {
                      updateDraft((current) => ({
                        ...current,
                        responsibilitySections: [
                          ...current.responsibilitySections,
                          {
                            id: `responsibility-${Date.now()}`,
                            title: 'New Responsibility Section',
                            items: ['Describe requirement'],
                          },
                        ],
                      }))
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add Responsibility Section
                  </button>
                )}
              </AppCardContent>
            </AppCard>

            <AppCard>
              <AppCardHeader>
                <AppCardTitle>Operational Notes</AppCardTitle>
                <AppCardDescription>
                  Local clarifications and command notes for DDS execution.
                </AppCardDescription>
              </AppCardHeader>
              <AppCardContent style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {isEditingTemplate ? (
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Notes (one per line)</legend>
                    <textarea
                      className="textarea textarea-bordered h-32 w-full"
                      value={toMultiline(activeTemplate.notes)}
                      onChange={(event) => {
                        const nextNotes = normalizeMultiline(event.target.value)
                        updateDraft((current) => ({
                          ...current,
                          notes: nextNotes,
                        }))
                      }}
                    />
                  </fieldset>
                ) : (
                  <ul
                    className="list-disc pl-5 text-sm"
                    style={{ display: 'grid', gap: 'var(--space-2)' }}
                  >
                    {activeTemplate.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                )}
              </AppCardContent>
            </AppCard>
          </div>

          <div>
            <AppCard className="lg:sticky" style={{ top: 'var(--space-4)' }}>
              <AppCardHeader>
                <AppCardTitle>Daily Checklist</AppCardTitle>
                <AppCardDescription>
                  Personal task completion is stored locally for {todayIso} on this device.
                </AppCardDescription>
              </AppCardHeader>

              <AppCardContent style={{ display: 'grid', gap: 'var(--space-4)' }}>
                <div className="w-full">
                  <progress
                    className="progress progress-primary w-full"
                    value={completionPercent}
                    max={100}
                  />
                  <div className="mt-1 text-xs text-base-content/70">
                    Progress: {completionPercent}% ({completedChecklistTasks}/{totalChecklistTasks})
                  </div>
                </div>

                {activeTemplate.checklistBlocks.map((block, blockIndex) => (
                  <section
                    key={block.id}
                    className="border border-base-300 bg-base-100"
                    style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-3)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0" style={{ display: 'grid', gap: 'var(--space-1)' }}>
                        {isEditingTemplate ? (
                          <input
                            value={block.timeLabel}
                            onChange={(event) => {
                              const nextTimeLabel = event.target.value
                              updateDraft((current) => {
                                const nextBlocks = [...current.checklistBlocks]
                                nextBlocks[blockIndex] = {
                                  ...nextBlocks[blockIndex],
                                  timeLabel: nextTimeLabel,
                                }
                                return { ...current, checklistBlocks: nextBlocks }
                              })
                            }}
                            className="input input-bordered input-sm w-full max-w-xs"
                            aria-label={`Checklist block ${blockIndex + 1} time`}
                          />
                        ) : (
                          <h3 className="font-semibold text-base">{block.timeLabel}</h3>
                        )}

                        {isEditingTemplate ? (
                          <input
                            value={block.heading ?? ''}
                            onChange={(event) => {
                              const nextHeading = event.target.value
                              updateDraft((current) => {
                                const nextBlocks = [...current.checklistBlocks]
                                nextBlocks[blockIndex] = {
                                  ...nextBlocks[blockIndex],
                                  heading: nextHeading.trim() ? nextHeading : null,
                                }
                                return { ...current, checklistBlocks: nextBlocks }
                              })
                            }}
                            className="input input-bordered input-sm w-full"
                            placeholder="Optional heading"
                            aria-label={`Checklist block ${blockIndex + 1} heading`}
                          />
                        ) : (
                          block.heading && (
                            <p className="text-sm text-base-content/70">{block.heading}</p>
                          )
                        )}
                      </div>

                      {isEditingTemplate && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-error"
                          onClick={() => {
                            updateDraft((current) => ({
                              ...current,
                              checklistBlocks: current.checklistBlocks.filter(
                                (_item, index) => index !== blockIndex
                              ),
                            }))
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      )}
                    </div>

                    {isEditingTemplate ? (
                      <fieldset className="fieldset">
                        <legend className="fieldset-legend">Tasks (one per line)</legend>
                        <textarea
                          className="textarea textarea-bordered h-48 w-full"
                          value={toMultiline(block.tasks)}
                          onChange={(event) => {
                            const nextTasks = normalizeMultiline(event.target.value)
                            updateDraft((current) => {
                              const nextBlocks = [...current.checklistBlocks]
                              nextBlocks[blockIndex] = {
                                ...nextBlocks[blockIndex],
                                tasks: nextTasks,
                              }
                              return { ...current, checklistBlocks: nextBlocks }
                            })
                          }}
                        />
                      </fieldset>
                    ) : (
                      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                        {block.tasks.map((task, taskIndex) => {
                          const taskKey = getTaskKey(block.id, taskIndex)
                          const checked = checkoffMap[taskKey] ?? false

                          return (
                            <label
                              key={taskKey}
                              className={cn(
                                'label w-full max-w-full cursor-pointer items-start justify-start gap-3 border border-base-300 bg-base-100',
                                checked && 'bg-success-fadded'
                              )}
                              style={{ padding: 'var(--space-2)' }}
                            >
                              <input
                                type="checkbox"
                                className="checkbox checkbox-primary checkbox-sm shrink-0"
                                checked={checked}
                                onChange={() => handleToggleTask(block.id, taskIndex)}
                                data-testid={`dds-task-${block.id}-${taskIndex}`}
                              />
                              <span
                                className={cn(
                                  'min-w-0 flex-1 whitespace-normal break-words text-sm',
                                  checked && 'line-through text-base-content/60'
                                )}
                              >
                                {task}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </section>
                ))}

                {isEditingTemplate && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm justify-self-start"
                    onClick={() => {
                      updateDraft((current) => ({
                        ...current,
                        checklistBlocks: [
                          ...current.checklistBlocks,
                          {
                            id: `checklist-${Date.now()}`,
                            timeLabel: 'New Time',
                            heading: null,
                            tasks: ['New task'],
                          },
                        ],
                      }))
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add Checklist Block
                  </button>
                )}
              </AppCardContent>
            </AppCard>
          </div>
        </div>
      </section>
    </main>
  )
}
