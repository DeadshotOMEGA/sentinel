'use client'

import { useState } from 'react'
import {
  BookOpenCheck,
  ClipboardList,
  Download,
  FileText,
  Pencil,
  Phone,
  PhoneCall,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { DdsChecklistCard } from '@/components/dds/dds-checklist-card'
import {
  AppCard,
  AppCardAction,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { AppAlert } from '@/components/ui/AppAlert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useDdsChecklist } from '@/hooks/use-dds-checklist'
import { useOperationalDateKey } from '@/hooks/use-operational-date-key'
import { useOperationalTimings } from '@/hooks/use-operational-timings'
import { useDdsPageContent } from '@/hooks/use-dds-page-content'
import { cloneDdsPageContent, parseDdsPageContent, type DdsPageContent } from '@/lib/dds-content'
import { cn } from '@/lib/utils'
import { AccountLevel, useAuthStore } from '@/store/auth-store'

function normalizeMultiline(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function toMultiline(values: string[]): string {
  return values.join('\n')
}

function normalizeOptionalInput(value: string): string | null {
  const next = value.trim()
  return next.length > 0 ? next : null
}

function formatUpdatedAt(value: string | null): string {
  if (!value) return 'Not yet saved'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString()
}

function isUpdatePlaceholder(value: string): boolean {
  return value.includes('<update required>')
}

export default function DdsPage() {
  const member = useAuthStore((state) => state.member)
  const hasMinimumLevel = useAuthStore((state) => state.hasMinimumLevel)
  const canEditTemplate = hasMinimumLevel(AccountLevel.ADMIN)
  const { data: timingsData } = useOperationalTimings({ enabled: true })
  const rolloverTime = timingsData?.settings.operational.dayRolloverTime ?? '03:00'
  const todayIso = useOperationalDateKey(rolloverTime)

  const { data, isLoading, isError, error, saveTemplateMutation } = useDdsPageContent()

  const [isEditingTemplate, setIsEditingTemplate] = useState(false)
  const [draftTemplate, setDraftTemplate] = useState<DdsPageContent | null>(null)

  const currentTemplate = data?.content ?? null
  const activeTemplate = isEditingTemplate ? draftTemplate : currentTemplate
  const checklist = useDdsChecklist({
    checklistBlocks: currentTemplate?.checklistBlocks ?? [],
    memberId: member?.id,
    dateKey: todayIso,
  })

  const totalChecklistTasks = checklist.totalTasks
  const completedChecklistTasks = checklist.completedTasks
  const completionPercent = checklist.completionPercent

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
      toast.error('Template data is invalid. Review titles and text fields.')
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
    checklist.toggleTask(blockId, taskIndex)
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
                Duty Day Staff responsibilities, duty phone playbook, member call triage, and daily
                execution checklist.
              </AppCardDescription>
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
            </AppCardAction>
          </div>
        </AppCardHeader>

        <AppCardContent>
          <AppAlert
            tone="info"
            heading="Template is editable"
            description="Admin/Developer users can update checklist, contacts, call playbooks, and reference downloads when SOP text changes."
            meta={`Last updated: ${formatUpdatedAt(templateState.updatedAt)}`}
            style={{ marginTop: 'var(--space-2)' }}
          />
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
                <AppCardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Quick Contacts
                </AppCardTitle>
                <AppCardDescription>
                  Editable duty contact references used for calls and escalations.
                </AppCardDescription>
              </AppCardHeader>
              <AppCardContent style={{ display: 'grid', gap: 'var(--space-4)' }}>
                {isEditingTemplate ? (
                  <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    {activeTemplate.quickContacts.map((contact, contactIndex) => (
                      <section
                        key={contact.id}
                        className="border border-base-300 bg-base-100"
                        style={{
                          padding: 'var(--space-4)',
                          display: 'grid',
                          gap: 'var(--space-3)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">Contact #{contactIndex + 1}</p>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm text-error"
                            onClick={() => {
                              updateDraft((current) => ({
                                ...current,
                                quickContacts: current.quickContacts.filter(
                                  (_item, index) => index !== contactIndex
                                ),
                              }))
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        </div>

                        <input
                          className="input input-bordered w-full"
                          value={contact.label}
                          placeholder="Contact label"
                          onChange={(event) => {
                            const nextLabel = event.target.value
                            updateDraft((current) => {
                              const nextContacts = [...current.quickContacts]
                              nextContacts[contactIndex] = {
                                ...nextContacts[contactIndex],
                                label: nextLabel,
                              }
                              return { ...current, quickContacts: nextContacts }
                            })
                          }}
                        />

                        <input
                          className="input input-bordered w-full"
                          value={contact.phone}
                          placeholder="Phone or extension"
                          onChange={(event) => {
                            const nextPhone = event.target.value
                            updateDraft((current) => {
                              const nextContacts = [...current.quickContacts]
                              nextContacts[contactIndex] = {
                                ...nextContacts[contactIndex],
                                phone: nextPhone,
                              }
                              return { ...current, quickContacts: nextContacts }
                            })
                          }}
                        />

                        <fieldset className="fieldset">
                          <legend className="fieldset-legend">Notes (optional)</legend>
                          <textarea
                            className="textarea h-24 w-full"
                            value={contact.notes ?? ''}
                            placeholder="Optional notes"
                            onChange={(event) => {
                              const nextNotes = normalizeOptionalInput(event.target.value)
                              updateDraft((current) => {
                                const nextContacts = [...current.quickContacts]
                                nextContacts[contactIndex] = {
                                  ...nextContacts[contactIndex],
                                  notes: nextNotes,
                                }
                                return { ...current, quickContacts: nextContacts }
                              })
                            }}
                          />
                        </fieldset>
                      </section>
                    ))}

                    <button
                      type="button"
                      className="btn btn-outline btn-sm justify-self-start"
                      onClick={() => {
                        updateDraft((current) => ({
                          ...current,
                          quickContacts: [
                            ...current.quickContacts,
                            {
                              id: `contact-${Date.now()}`,
                              label: 'New Contact',
                              phone: '<update required>',
                              notes: null,
                            },
                          ],
                        }))
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add Contact
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Contact</th>
                          <th>Phone</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeTemplate.quickContacts.map((contact) => (
                          <tr key={contact.id}>
                            <td className="font-medium">{contact.label}</td>
                            <td>
                              {isUpdatePlaceholder(contact.phone) ? (
                                <span className="text-warning font-medium">{contact.phone}</span>
                              ) : (
                                <a className="link link-primary" href={`tel:${contact.phone}`}>
                                  {contact.phone}
                                </a>
                              )}
                            </td>
                            <td className="text-sm text-base-content/80">{contact.notes ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </AppCardContent>
            </AppCard>

            <AppCard>
              <AppCardHeader>
                <AppCardTitle className="flex items-center gap-2">
                  <PhoneCall className="h-5 w-5 text-primary" />
                  Duty Phone Protocol
                </AppCardTitle>
                <AppCardDescription>
                  Missed-call workflow, call categories, and priority message handling.
                </AppCardDescription>
              </AppCardHeader>
              <AppCardContent style={{ display: 'grid', gap: 'var(--space-4)' }}>
                {isEditingTemplate ? (
                  <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    {activeTemplate.dutyPhoneProtocol.map((section, sectionIndex) => (
                      <section
                        key={section.id}
                        className="border border-base-300 bg-base-100"
                        style={{
                          padding: 'var(--space-4)',
                          display: 'grid',
                          gap: 'var(--space-3)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <input
                            className="input input-bordered w-full"
                            value={section.title}
                            onChange={(event) => {
                              const nextTitle = event.target.value
                              updateDraft((current) => {
                                const nextSections = [...current.dutyPhoneProtocol]
                                nextSections[sectionIndex] = {
                                  ...nextSections[sectionIndex],
                                  title: nextTitle,
                                }
                                return { ...current, dutyPhoneProtocol: nextSections }
                              })
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm text-error"
                            onClick={() => {
                              updateDraft((current) => ({
                                ...current,
                                dutyPhoneProtocol: current.dutyPhoneProtocol.filter(
                                  (_item, index) => index !== sectionIndex
                                ),
                              }))
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        </div>

                        <fieldset className="fieldset">
                          <legend className="fieldset-legend">Protocol items (one per line)</legend>
                          <textarea
                            className="textarea textarea-bordered h-36 w-full"
                            value={toMultiline(section.items)}
                            onChange={(event) => {
                              const nextItems = normalizeMultiline(event.target.value)
                              updateDraft((current) => {
                                const nextSections = [...current.dutyPhoneProtocol]
                                nextSections[sectionIndex] = {
                                  ...nextSections[sectionIndex],
                                  items: nextItems,
                                }
                                return { ...current, dutyPhoneProtocol: nextSections }
                              })
                            }}
                          />
                        </fieldset>
                      </section>
                    ))}

                    <button
                      type="button"
                      className="btn btn-outline btn-sm justify-self-start"
                      onClick={() => {
                        updateDraft((current) => ({
                          ...current,
                          dutyPhoneProtocol: [
                            ...current.dutyPhoneProtocol,
                            {
                              id: `protocol-${Date.now()}`,
                              title: 'New Protocol Section',
                              items: ['Describe procedure'],
                            },
                          ],
                        }))
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add Protocol Section
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                    {activeTemplate.dutyPhoneProtocol.map((section, sectionIndex) => (
                      <details
                        key={section.id}
                        className="collapse collapse-arrow border border-base-300 bg-base-100"
                        open={sectionIndex === 0}
                      >
                        <summary className="collapse-title font-semibold">{section.title}</summary>
                        <div className="collapse-content">
                          <ul
                            className="list-disc pl-5 text-sm"
                            style={{ display: 'grid', gap: 'var(--space-2)' }}
                          >
                            {section.items.map((item) => (
                              <li key={`${section.id}-${item}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </AppCardContent>
            </AppCard>

            <AppCard>
              <AppCardHeader>
                <AppCardTitle className="flex items-center gap-2">
                  <BookOpenCheck className="h-5 w-5 text-primary" />
                  Member Call Triage
                </AppCardTitle>
                <AppCardDescription>
                  Member travel disruption scenarios and required DDS response steps.
                </AppCardDescription>
              </AppCardHeader>
              <AppCardContent style={{ display: 'grid', gap: 'var(--space-4)' }}>
                {isEditingTemplate ? (
                  <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    {activeTemplate.memberCallScenarios.map((scenario, scenarioIndex) => (
                      <section
                        key={scenario.id}
                        className="border border-base-300 bg-base-100"
                        style={{
                          padding: 'var(--space-4)',
                          display: 'grid',
                          gap: 'var(--space-3)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <input
                            className="input input-bordered w-full"
                            value={scenario.scenario}
                            onChange={(event) => {
                              const nextScenario = event.target.value
                              updateDraft((current) => {
                                const nextScenarios = [...current.memberCallScenarios]
                                nextScenarios[scenarioIndex] = {
                                  ...nextScenarios[scenarioIndex],
                                  scenario: nextScenario,
                                }
                                return { ...current, memberCallScenarios: nextScenarios }
                              })
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm text-error"
                            onClick={() => {
                              updateDraft((current) => ({
                                ...current,
                                memberCallScenarios: current.memberCallScenarios.filter(
                                  (_item, index) => index !== scenarioIndex
                                ),
                              }))
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        </div>

                        <fieldset className="fieldset">
                          <legend className="fieldset-legend">Guidance items (one per line)</legend>
                          <textarea
                            className="textarea textarea-bordered h-36 w-full"
                            value={toMultiline(scenario.guidance)}
                            onChange={(event) => {
                              const nextGuidance = normalizeMultiline(event.target.value)
                              updateDraft((current) => {
                                const nextScenarios = [...current.memberCallScenarios]
                                nextScenarios[scenarioIndex] = {
                                  ...nextScenarios[scenarioIndex],
                                  guidance: nextGuidance,
                                }
                                return { ...current, memberCallScenarios: nextScenarios }
                              })
                            }}
                          />
                        </fieldset>
                      </section>
                    ))}

                    <button
                      type="button"
                      className="btn btn-outline btn-sm justify-self-start"
                      onClick={() => {
                        updateDraft((current) => ({
                          ...current,
                          memberCallScenarios: [
                            ...current.memberCallScenarios,
                            {
                              id: `scenario-${Date.now()}`,
                              scenario: 'New Scenario',
                              guidance: ['Describe response steps'],
                            },
                          ],
                        }))
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add Scenario
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                    {activeTemplate.memberCallScenarios.map((scenario) => (
                      <details
                        key={scenario.id}
                        className="collapse collapse-arrow border border-base-300 bg-base-100"
                      >
                        <summary className="collapse-title font-semibold">
                          {scenario.scenario}
                        </summary>
                        <div className="collapse-content">
                          <ul
                            className="list-disc pl-5 text-sm"
                            style={{ display: 'grid', gap: 'var(--space-2)' }}
                          >
                            {scenario.guidance.map((item) => (
                              <li key={`${scenario.id}-${item}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </AppCardContent>
            </AppCard>

            <AppCard>
              <AppCardHeader>
                <AppCardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Phone Log Requirements
                </AppCardTitle>
                <AppCardDescription>
                  Required information for every duty phone log entry.
                </AppCardDescription>
              </AppCardHeader>
              <AppCardContent style={{ display: 'grid', gap: 'var(--space-4)' }}>
                {activeTemplate.phoneLogRequirements.map((requirement, requirementIndex) => (
                  <section
                    key={requirement.id}
                    className="border border-base-300 bg-base-100"
                    style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-3)' }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {isEditingTemplate ? (
                        <input
                          className="input input-bordered w-full"
                          value={requirement.title}
                          onChange={(event) => {
                            const nextTitle = event.target.value
                            updateDraft((current) => {
                              const nextRequirements = [...current.phoneLogRequirements]
                              nextRequirements[requirementIndex] = {
                                ...nextRequirements[requirementIndex],
                                title: nextTitle,
                              }
                              return { ...current, phoneLogRequirements: nextRequirements }
                            })
                          }}
                        />
                      ) : (
                        <h3 className="font-semibold text-base">{requirement.title}</h3>
                      )}

                      {isEditingTemplate && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-error"
                          onClick={() => {
                            updateDraft((current) => ({
                              ...current,
                              phoneLogRequirements: current.phoneLogRequirements.filter(
                                (_item, index) => index !== requirementIndex
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
                          className="textarea textarea-bordered h-28 w-full"
                          value={toMultiline(requirement.items)}
                          onChange={(event) => {
                            const nextItems = normalizeMultiline(event.target.value)
                            updateDraft((current) => {
                              const nextRequirements = [...current.phoneLogRequirements]
                              nextRequirements[requirementIndex] = {
                                ...nextRequirements[requirementIndex],
                                items: nextItems,
                              }
                              return { ...current, phoneLogRequirements: nextRequirements }
                            })
                          }}
                        />
                      </fieldset>
                    ) : (
                      <ul
                        className="list-disc pl-5 text-sm"
                        style={{ display: 'grid', gap: 'var(--space-2)' }}
                      >
                        {requirement.items.map((item) => (
                          <li key={`${requirement.id}-${item}`}>{item}</li>
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
                        phoneLogRequirements: [
                          ...current.phoneLogRequirements,
                          {
                            id: `phone-log-${Date.now()}`,
                            title: 'New Requirement',
                            items: ['Describe required log detail'],
                          },
                        ],
                      }))
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add Requirement
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

          <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
            {isEditingTemplate ? (
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
                      Progress: {completionPercent}% ({completedChecklistTasks}/
                      {totalChecklistTasks})
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
                        </div>

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
                      </div>

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
                    </section>
                  ))}

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
                </AppCardContent>
              </AppCard>
            ) : (
              <div className="lg:sticky" style={{ top: 'var(--space-4)' }}>
                <DdsChecklistCard
                  checkoffMap={checklist.checkoffMap}
                  checklistBlocks={activeTemplate.checklistBlocks}
                  completedTasks={completedChecklistTasks}
                  completionPercent={completionPercent}
                  description={`Personal task completion is stored locally for ${todayIso} on this device.`}
                  onToggleTask={handleToggleTask}
                  totalTasks={totalChecklistTasks}
                />
              </div>
            )}

            <AppCard>
              <AppCardHeader>
                <AppCardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  Reference Downloads
                </AppCardTitle>
                <AppCardDescription>
                  Source SOP, phone log, member call guide, and floor plan documents.
                </AppCardDescription>
              </AppCardHeader>
              <AppCardContent style={{ display: 'grid', gap: 'var(--space-4)' }}>
                {isEditingTemplate ? (
                  <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    {activeTemplate.referenceDownloads.map((download, downloadIndex) => (
                      <section
                        key={download.id}
                        className="border border-base-300 bg-base-100"
                        style={{
                          padding: 'var(--space-4)',
                          display: 'grid',
                          gap: 'var(--space-3)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">Reference #{downloadIndex + 1}</p>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm text-error"
                            onClick={() => {
                              updateDraft((current) => ({
                                ...current,
                                referenceDownloads: current.referenceDownloads.filter(
                                  (_item, index) => index !== downloadIndex
                                ),
                              }))
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        </div>

                        <input
                          className="input input-bordered w-full"
                          value={download.title}
                          placeholder="Reference title"
                          onChange={(event) => {
                            const nextTitle = event.target.value
                            updateDraft((current) => {
                              const nextDownloads = [...current.referenceDownloads]
                              nextDownloads[downloadIndex] = {
                                ...nextDownloads[downloadIndex],
                                title: nextTitle,
                              }
                              return { ...current, referenceDownloads: nextDownloads }
                            })
                          }}
                        />

                        <div
                          className="grid sm:grid-cols-[minmax(0,_1fr)_140px]"
                          style={{ gap: 'var(--space-2)' }}
                        >
                          <input
                            className="input input-bordered w-full"
                            value={download.href}
                            placeholder="/assets/dds/..."
                            onChange={(event) => {
                              const nextHref = event.target.value
                              updateDraft((current) => {
                                const nextDownloads = [...current.referenceDownloads]
                                nextDownloads[downloadIndex] = {
                                  ...nextDownloads[downloadIndex],
                                  href: nextHref,
                                }
                                return { ...current, referenceDownloads: nextDownloads }
                              })
                            }}
                          />
                          <select
                            className="select select-bordered w-full"
                            value={download.fileType}
                            onChange={(event) => {
                              const nextType = event.target.value as 'pdf' | 'docx'
                              updateDraft((current) => {
                                const nextDownloads = [...current.referenceDownloads]
                                nextDownloads[downloadIndex] = {
                                  ...nextDownloads[downloadIndex],
                                  fileType: nextType,
                                }
                                return { ...current, referenceDownloads: nextDownloads }
                              })
                            }}
                          >
                            <option value="pdf">PDF</option>
                            <option value="docx">DOCX</option>
                          </select>
                        </div>

                        <fieldset className="fieldset">
                          <legend className="fieldset-legend">Description (optional)</legend>
                          <textarea
                            className="textarea h-24 w-full"
                            value={download.description ?? ''}
                            placeholder="Optional description"
                            onChange={(event) => {
                              const nextDescription = normalizeOptionalInput(event.target.value)
                              updateDraft((current) => {
                                const nextDownloads = [...current.referenceDownloads]
                                nextDownloads[downloadIndex] = {
                                  ...nextDownloads[downloadIndex],
                                  description: nextDescription,
                                }
                                return { ...current, referenceDownloads: nextDownloads }
                              })
                            }}
                          />
                        </fieldset>
                      </section>
                    ))}

                    <button
                      type="button"
                      className="btn btn-outline btn-sm justify-self-start"
                      onClick={() => {
                        updateDraft((current) => ({
                          ...current,
                          referenceDownloads: [
                            ...current.referenceDownloads,
                            {
                              id: `ref-${Date.now()}`,
                              title: 'New Reference',
                              href: '/assets/dds/<update-file>',
                              fileType: 'pdf',
                              description: null,
                            },
                          ],
                        }))
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add Reference
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Document</th>
                          <th>Type</th>
                          <th>Description</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeTemplate.referenceDownloads.map((download) => (
                          <tr key={download.id}>
                            <td className="font-medium">{download.title}</td>
                            <td>
                              <span className="badge badge-ghost badge-sm uppercase">
                                {download.fileType}
                              </span>
                            </td>
                            <td className="text-sm text-base-content/80">
                              {download.description ?? '—'}
                            </td>
                            <td>
                              <a
                                className="btn btn-ghost btn-sm"
                                href={download.href}
                                target="_blank"
                                rel="noreferrer"
                                download
                              >
                                <Download className="h-4 w-4" />
                                Open
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </AppCardContent>
            </AppCard>
          </div>
        </div>
      </section>
    </main>
  )
}
