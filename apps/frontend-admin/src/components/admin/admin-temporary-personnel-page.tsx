'use client'

import { type FormEvent, useMemo, useState } from 'react'
import {
  BadgeCheck,
  CalendarClock,
  History,
  Plus,
  RotateCcw,
  ShieldOff,
  UserPlus,
} from 'lucide-react'
import type {
  CreateTemporaryPersonnelAssignmentInput,
  CreateTemporaryPersonnelInput,
  TemporaryPersonnelAssignmentResponse,
  TemporaryPersonnelResponse,
} from '@sentinel/contracts'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { AppBadge } from '@/components/ui/AppBadge'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useBadges } from '@/hooks/use-badges'
import {
  useAddTemporaryPersonnel,
  useAssignTemporaryPersonnelNfcTag,
  useCreateTemporaryPersonnelAssignment,
  useEndTemporaryPersonnel,
  useEndTemporaryPersonnelAssignment,
  useReturnTemporaryPersonnelNfcTag,
  useTemporaryPersonnelAssignments,
  useTemporaryPersonnelHistory,
} from '@/hooks/use-temporary-personnel'

type AssignmentStatus = TemporaryPersonnelAssignmentResponse['status']
type PersonnelStatus = TemporaryPersonnelResponse['status']

interface MutationError {
  message: string
}

function toLocalInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function localInputToIso(value: string): string {
  return new Date(value).toISOString()
}

function formatDateTime(value: string | null): string {
  if (!value) return 'None'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getStatusTone(status: AssignmentStatus | PersonnelStatus) {
  if (status === 'active') return 'success'
  if (status === 'draft') return 'info'
  if (status === 'ended') return 'neutral'
  return 'error'
}

function getErrorMessage(error: unknown): string | null {
  if (!error) return null
  if (typeof error === 'object' && 'message' in error) {
    return String((error as MutationError).message)
  }
  return 'Operation failed.'
}

function AssignmentForm() {
  const createAssignment = useCreateTemporaryPersonnelAssignment()
  const [name, setName] = useState('Standing Court Martial')
  const [sponsorName, setSponsorName] = useState('')
  const [startsAt, setStartsAt] = useState(() => toLocalInputValue(new Date()))
  const [endsAt, setEndsAt] = useState(() => {
    const defaultEnd = new Date()
    defaultEnd.setDate(defaultEnd.getDate() + 30)
    defaultEnd.setHours(17, 0, 0, 0)
    return toLocalInputValue(defaultEnd)
  })
  const [notes, setNotes] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload: CreateTemporaryPersonnelAssignmentInput = {
      name,
      sponsorName,
      startsAt: localInputToIso(startsAt),
      endsAt: localInputToIso(endsAt),
      status: 'active',
      notes: notes.trim() || undefined,
    }
    createAssignment.mutate(payload, {
      onSuccess: () => {
        setName('Standing Court Martial')
        setSponsorName('')
        setNotes('')
      },
    })
  }

  return (
    <AppCard>
      <AppCardHeader>
        <AppCardTitle className="flex items-center gap-2 text-lg">
          <CalendarClock className="h-5 w-5" aria-hidden="true" />
          New assignment
        </AppCardTitle>
        <AppCardDescription>
          A bounded access window for non-member personnel with presence-only tags.
        </AppCardDescription>
      </AppCardHeader>
      <AppCardContent>
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <label className="form-control">
            <span className="label-text">Assignment name</span>
            <input
              className="input input-bordered"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text">Sponsor</span>
            <input
              className="input input-bordered"
              value={sponsorName}
              onChange={(event) => setSponsorName(event.target.value)}
              required
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="form-control">
              <span className="label-text">Starts</span>
              <input
                type="datetime-local"
                className="input input-bordered"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                required
              />
            </label>
            <label className="form-control">
              <span className="label-text">Ends</span>
              <input
                type="datetime-local"
                className="input input-bordered"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                required
              />
            </label>
          </div>
          <label className="form-control">
            <span className="label-text">Notes</span>
            <textarea
              className="textarea textarea-bordered min-h-24"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          {createAssignment.error && (
            <p className="text-sm text-error">{getErrorMessage(createAssignment.error)}</p>
          )}
          <button
            className="btn btn-primary justify-self-start"
            disabled={createAssignment.isPending}
          >
            {createAssignment.isPending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            Create assignment
          </button>
        </form>
      </AppCardContent>
    </AppCard>
  )
}

function AddPersonnelForm({ assignmentId }: { assignmentId: string }) {
  const addPersonnel = useAddTemporaryPersonnel()
  const [displayName, setDisplayName] = useState('')
  const [organization, setOrganization] = useState('')
  const [role, setRole] = useState('')
  const [rankPrefix, setRankPrefix] = useState('')
  const [mobilePhone, setMobilePhone] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload: CreateTemporaryPersonnelInput = {
      displayName,
      organization,
      rankPrefix: rankPrefix.trim() || undefined,
      role: role.trim() || undefined,
      mobilePhone: mobilePhone.trim() || undefined,
    }
    addPersonnel.mutate(
      { assignmentId, data: payload },
      {
        onSuccess: () => {
          setDisplayName('')
          setOrganization('')
          setRole('')
          setRankPrefix('')
          setMobilePhone('')
        },
      }
    )
  }

  return (
    <form className="grid gap-3 border-t border-base-300 pt-4" onSubmit={handleSubmit}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Add person
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="form-control">
          <span className="label-text">Display name</span>
          <input
            className="input input-bordered"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
        </label>
        <label className="form-control">
          <span className="label-text">Organization</span>
          <input
            className="input input-bordered"
            value={organization}
            onChange={(event) => setOrganization(event.target.value)}
            required
          />
        </label>
        <label className="form-control">
          <span className="label-text">Rank/title</span>
          <input
            className="input input-bordered"
            value={rankPrefix}
            onChange={(event) => setRankPrefix(event.target.value)}
          />
        </label>
        <label className="form-control">
          <span className="label-text">Role</span>
          <input
            className="input input-bordered"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          />
        </label>
        <label className="form-control md:col-span-2">
          <span className="label-text">Phone</span>
          <input
            className="input input-bordered"
            value={mobilePhone}
            onChange={(event) => setMobilePhone(event.target.value)}
          />
        </label>
      </div>
      {addPersonnel.error && (
        <p className="text-sm text-error">{getErrorMessage(addPersonnel.error)}</p>
      )}
      <button className="btn btn-secondary justify-self-start" disabled={addPersonnel.isPending}>
        {addPersonnel.isPending ? <LoadingSpinner size="sm" /> : <Plus className="h-4 w-4" />}
        Add person
      </button>
    </form>
  )
}

function PersonnelRow({ person }: { person: TemporaryPersonnelResponse }) {
  const assignTag = useAssignTemporaryPersonnelNfcTag()
  const returnTag = useReturnTemporaryPersonnelNfcTag()
  const endPerson = useEndTemporaryPersonnel()
  const { data: badgesData, isLoading: badgesLoading } = useBadges({
    status: 'active',
    assignmentType: 'unassigned',
    unassignedOnly: true,
    limit: 100,
  })
  const [selectedBadgeId, setSelectedBadgeId] = useState('')
  const availableBadges = badgesData?.badges ?? []
  const currentTag = person.currentNfcAssignment
  const isClosed = person.status !== 'active'

  return (
    <tr>
      <td>
        <div className="font-medium">{person.displayName}</div>
        <div className="text-xs text-base-content/60">
          {[person.rankPrefix, person.role].filter(Boolean).join(' · ') || 'Temporary personnel'}
        </div>
      </td>
      <td>{person.organization}</td>
      <td>
        <AppBadge status={getStatusTone(person.status)} size="sm">
          {person.status}
        </AppBadge>
      </td>
      <td>
        {currentTag ? (
          <div className="flex flex-wrap items-center gap-2">
            <AppBadge status="success" size="sm">
              {currentTag.badgeSerialNumber}
            </AppBadge>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => returnTag.mutate(currentTag.id)}
              disabled={returnTag.isPending || isClosed}
              title="Return NFC tag"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="select select-bordered select-sm min-w-48"
              value={selectedBadgeId}
              onChange={(event) => setSelectedBadgeId(event.target.value)}
              disabled={badgesLoading || isClosed}
              aria-label={`Select NFC tag for ${person.displayName}`}
            >
              <option value="">Select tag</option>
              {availableBadges.map((badge) => (
                <option key={badge.id} value={badge.id}>
                  {badge.serialNumber}
                </option>
              ))}
            </select>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                if (!selectedBadgeId) return
                assignTag.mutate(
                  { id: person.id, data: { badgeId: selectedBadgeId } },
                  { onSuccess: () => setSelectedBadgeId('') }
                )
              }}
              disabled={!selectedBadgeId || assignTag.isPending || isClosed}
            >
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              Assign
            </button>
          </div>
        )}
        {(assignTag.error || returnTag.error) && (
          <p className="mt-1 text-xs text-error">
            {getErrorMessage(assignTag.error ?? returnTag.error)}
          </p>
        )}
      </td>
      <td className="text-right">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() =>
            endPerson.mutate({
              id: person.id,
              data: { reason: 'Temporary personnel access ended by admin.' },
            })
          }
          disabled={endPerson.isPending || isClosed}
        >
          <ShieldOff className="h-4 w-4" aria-hidden="true" />
          End
        </button>
      </td>
    </tr>
  )
}

function AssignmentDetail({
  assignment,
}: {
  assignment: TemporaryPersonnelAssignmentResponse | null
}) {
  const endAssignment = useEndTemporaryPersonnelAssignment()
  const history = useTemporaryPersonnelHistory(assignment?.id ?? null)

  if (!assignment) {
    return (
      <AppCard>
        <AppCardContent>
          <EmptyState
            icon={CalendarClock}
            title="Select an assignment"
            description="Choose an active assignment to manage people and NFC tags."
          />
        </AppCardContent>
      </AppCard>
    )
  }

  const isClosed = assignment.status === 'ended' || assignment.status === 'revoked'

  return (
    <div className="space-y-4">
      <AppCard>
        <AppCardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <AppCardTitle className="text-xl">{assignment.name}</AppCardTitle>
              <AppCardDescription>
                {assignment.sponsorName} · {formatDateTime(assignment.startsAt)} to{' '}
                {formatDateTime(assignment.endsAt)}
              </AppCardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AppBadge status={getStatusTone(assignment.status)}>{assignment.status}</AppBadge>
              <button
                className="btn btn-outline btn-sm"
                onClick={() =>
                  endAssignment.mutate({
                    id: assignment.id,
                    data: { reason: 'Temporary personnel assignment ended by admin.' },
                  })
                }
                disabled={endAssignment.isPending || isClosed}
              >
                <ShieldOff className="h-4 w-4" aria-hidden="true" />
                End assignment
              </button>
            </div>
          </div>
        </AppCardHeader>
        <AppCardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase text-base-content/50">People</div>
              <div className="text-2xl font-semibold">{assignment.personnelCount}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-base-content/50">Active</div>
              <div className="text-2xl font-semibold">{assignment.activePersonnelCount}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-base-content/50">Present</div>
              <div className="text-2xl font-semibold">{assignment.presentPersonnelCount}</div>
            </div>
          </div>

          {assignment.personnel.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No personnel yet"
              description="Add court staff or other temporary workers before issuing tags."
              className="py-8"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Organization</th>
                    <th>Status</th>
                    <th>NFC tag</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignment.personnel.map((person) => (
                    <PersonnelRow key={person.id} person={person} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isClosed && <AddPersonnelForm assignmentId={assignment.id} />}
        </AppCardContent>
      </AppCard>

      <AppCard>
        <AppCardHeader>
          <AppCardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" aria-hidden="true" />
            Recent history
          </AppCardTitle>
        </AppCardHeader>
        <AppCardContent>
          {history.isLoading ? (
            <LoadingSpinner size="md" />
          ) : history.data?.checkins.length ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Direction</th>
                    <th>Kiosk</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.checkins.slice(0, 8).map((checkin) => (
                    <tr key={checkin.id}>
                      <td>{formatDateTime(checkin.timestamp)}</td>
                      <td>{checkin.direction}</td>
                      <td>{checkin.kioskId}</td>
                      <td>{checkin.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-base-content/60">No NFC scan history yet.</p>
          )}
        </AppCardContent>
      </AppCard>
    </div>
  )
}

export function AdminTemporaryPersonnelPage() {
  const [includeHistory, setIncludeHistory] = useState(false)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)
  const assignmentsQuery = useTemporaryPersonnelAssignments(includeHistory)
  const assignments = useMemo(
    () => assignmentsQuery.data?.assignments ?? [],
    [assignmentsQuery.data?.assignments]
  )
  const selectedAssignment =
    assignments.find((assignment) => assignment.id === selectedAssignmentId) ??
    assignments[0] ??
    null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 id="admin-page-title" className="flex items-center gap-2 text-2xl font-bold">
            <BadgeCheck className="h-6 w-6" aria-hidden="true" />
            Temporary Personnel
          </h1>
          <p className="text-sm text-base-content/60">
            Issue presence-only NFC tags to non-members for short assignments.
          </p>
        </div>
        <label className="label cursor-pointer gap-2">
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={includeHistory}
            onChange={(event) => setIncludeHistory(event.target.checked)}
          />
          <span className="label-text">Show closed</span>
        </label>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="space-y-4">
          <AssignmentForm />

          <AppCard>
            <AppCardHeader>
              <AppCardTitle className="text-lg">Assignments</AppCardTitle>
            </AppCardHeader>
            <AppCardContent>
              {assignmentsQuery.isLoading ? (
                <LoadingSpinner size="md" />
              ) : assignments.length === 0 ? (
                <EmptyState
                  icon={CalendarClock}
                  title="No assignments"
                  description="Create an assignment before issuing temporary tags."
                  className="py-8"
                />
              ) : (
                <div className="space-y-2">
                  {assignments.map((assignment) => (
                    <button
                      key={assignment.id}
                      className={`btn h-auto w-full justify-between rounded-md px-3 py-3 text-left ${
                        selectedAssignment?.id === assignment.id
                          ? 'btn-primary'
                          : 'btn-ghost border border-base-300'
                      }`}
                      onClick={() => setSelectedAssignmentId(assignment.id)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{assignment.name}</span>
                        <span className="block truncate text-xs opacity-70">
                          {assignment.personnelCount} people · {assignment.presentPersonnelCount}{' '}
                          present
                        </span>
                      </span>
                      <AppBadge status={getStatusTone(assignment.status)} size="sm">
                        {assignment.status}
                      </AppBadge>
                    </button>
                  ))}
                </div>
              )}
            </AppCardContent>
          </AppCard>
        </div>

        <AssignmentDetail assignment={selectedAssignment} />
      </div>
    </div>
  )
}
