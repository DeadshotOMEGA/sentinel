'use client'

import { FormEvent, useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import {
  Shield,
  Plus,
  Pencil,
  KeyRound,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { AdminUserResponse, CreateAdminUser } from '@sentinel/contracts'
import { useAuthStore, AccountLevel } from '@/store/auth-store'
import {
  useAdminUsers,
  useCreateAdminUser,
  useDisableAdminUser,
  useEnableAdminUser,
  useResetAdminUserPassword,
  useUpdateAdminUser,
} from '@/hooks/use-admin-users'
import { TableSkeleton } from '@/components/ui/loading-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { TID } from '@/lib/test-ids'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const columnHelper = createColumnHelper<AdminUserResponse>()

type UserFormValues = {
  username: string
  displayName: string
  role: AdminUserResponse['role']
  email?: string
  firstName?: string
  lastName?: string
  password?: string
}

function formatRole(role: AdminUserResponse['role']): string {
  if (role === 'quartermaster') return 'Quartermaster'
  if (role === 'developer') return 'Developer'
  return 'Admin'
}

function SortableHeader({
  label,
  onToggle,
  state,
}: {
  label: string
  onToggle: () => void
  state: false | 'asc' | 'desc'
}) {
  return (
    <button type="button" className="btn btn-ghost btn-sm -ml-3 h-8" onClick={onToggle}>
      {label}
      <span className="ml-1 text-xs opacity-60">
        {state === 'asc' ? '▲' : state === 'desc' ? '▼' : '↕'}
      </span>
    </button>
  )
}

export default function AdminUsersPage() {
  const currentMember = useAuthStore((s) => s.member)
  const canManage = (currentMember?.accountLevel ?? 0) >= AccountLevel.ADMIN
  const { data, isLoading, isError, error } = useAdminUsers()
  const createUser = useCreateAdminUser()
  const updateUser = useUpdateAdminUser()
  const resetPassword = useResetAdminUserPassword()
  const disableUser = useDisableAdminUser()
  const enableUser = useEnableAdminUser()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'quartermaster' | 'admin' | 'developer'>(
    'all'
  )
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [sorting, setSorting] = useState<SortingState>([])

  const [creating, setCreating] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUserResponse | null>(null)
  const [passwordUser, setPasswordUser] = useState<AdminUserResponse | null>(null)
  const [statusUser, setStatusUser] = useState<AdminUserResponse | null>(null)

  const filteredUsers = useMemo(() => {
    const users = data ?? []
    return users.filter((user) => {
      const roleMatches = roleFilter === 'all' || user.role === roleFilter
      const statusMatches =
        statusFilter === 'all' ||
        (statusFilter === 'enabled' && !user.disabled) ||
        (statusFilter === 'disabled' && user.disabled)
      const searchTerm = search.trim().toLowerCase()
      const searchMatches =
        searchTerm.length === 0 ||
        user.username.toLowerCase().includes(searchTerm) ||
        user.displayName.toLowerCase().includes(searchTerm) ||
        (user.email ?? '').toLowerCase().includes(searchTerm)

      return roleMatches && statusMatches && searchMatches
    })
  }, [data, roleFilter, search, statusFilter])

  const total = filteredUsers.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const currentPage = Math.min(page, totalPages)

  const pageUsers = useMemo(() => {
    const start = (currentPage - 1) * limit
    return filteredUsers.slice(start, start + limit)
  }, [currentPage, filteredUsers, limit])

  const columns = useMemo(
    () => [
      columnHelper.accessor('username', {
        header: ({ column }) => (
          <SortableHeader
            label="Username"
            state={column.getIsSorted()}
            onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          />
        ),
      }),
      columnHelper.accessor('displayName', {
        header: ({ column }) => (
          <SortableHeader
            label="Display Name"
            state={column.getIsSorted()}
            onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          />
        ),
      }),
      columnHelper.accessor('role', {
        header: ({ column }) => (
          <SortableHeader
            label="Role"
            state={column.getIsSorted()}
            onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          />
        ),
        cell: (info) => <span className="badge badge-outline">{formatRole(info.getValue())}</span>,
      }),
      columnHelper.accessor('email', {
        header: 'Email',
        cell: (info) => info.getValue() ?? <span className="text-base-content/50">—</span>,
      }),
      columnHelper.accessor('disabled', {
        header: 'Status',
        cell: (info) =>
          info.getValue() ? (
            <span className="badge badge-warning">Disabled</span>
          ) : (
            <span className="badge badge-success">Enabled</span>
          ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: (info) => {
          const user = info.row.original
          const isSelf = currentMember?.id === user.id
          return (
            <div className="flex justify-end gap-1">
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setEditingUser(user)}
                disabled={!canManage}
                data-testid={TID.adminUsers.rowAction(user.id, 'edit')}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setPasswordUser(user)}
                disabled={!canManage}
                data-testid={TID.adminUsers.rowAction(user.id, 'reset-password')}
              >
                <KeyRound className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setStatusUser(user)}
                disabled={!canManage || isSelf}
                data-testid={TID.adminUsers.rowAction(
                  user.id,
                  user.disabled ? 'enable' : 'disable'
                )}
              >
                {user.disabled ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Ban className="h-3.5 w-3.5 text-warning" />
                )}
              </button>
            </div>
          )
        },
      }),
    ],
    [canManage, currentMember?.id]
  )

  const table = useReactTable({
    data: pageUsers,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (!canManage) {
    return (
      <div className="alert alert-error" role="alert">
        <span>Admin or Developer access is required to manage user accounts.</span>
      </div>
    )
  }

  return (
    <div className="space-y-(--space-4)">
      <div className="flex items-start justify-between gap-(--space-3)">
        <div>
          <h1 className="font-display text-2xl">User Accounts</h1>
          <p className="text-sm text-base-content/70">
            Manage administrative user accounts, roles, credentials, and account status.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setCreating(true)}
          data-testid={TID.adminUsers.newUserBtn}
        >
          <Plus className="h-4 w-4" />
          New User
        </button>
      </div>

      <div className="card border border-base-300 bg-base-100">
        <div className="card-body gap-(--space-3)">
          <div className="grid grid-cols-1 gap-(--space-2) md:grid-cols-4">
            <label className="input input-bordered flex items-center gap-2 md:col-span-2">
              <Shield className="h-4 w-4 opacity-70" />
              <input
                id="admin-user-search"
                type="text"
                className="grow"
                placeholder="Search username, display name, or email"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                data-testid={TID.adminUsers.filter.search}
              />
            </label>
            <select
              className="select select-bordered w-full"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as typeof roleFilter)
                setPage(1)
              }}
              data-testid={TID.adminUsers.filter.role}
            >
              <option value="all">All Roles</option>
              <option value="quartermaster">Quartermaster</option>
              <option value="admin">Admin</option>
              <option value="developer">Developer</option>
            </select>
            <select
              className="select select-bordered w-full"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter)
                setPage(1)
              }}
              data-testid={TID.adminUsers.filter.status}
            >
              <option value="all">All Statuses</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          {isError && (
            <div className="alert alert-error" data-testid={TID.adminUsers.errorAlert}>
              <span>{error instanceof Error ? error.message : 'Failed to load user accounts'}</span>
            </div>
          )}

          <div className="overflow-x-auto rounded-box border border-base-300">
            {isLoading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : total === 0 ? (
              <EmptyState
                icon={Shield}
                title="No user accounts found"
                description="Adjust filters or create a new user account."
              />
            ) : (
              <table className="table table-zebra" data-testid={TID.adminUsers.table}>
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} data-testid={TID.adminUsers.row(row.original.id)}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between gap-(--space-3)">
            <div className="text-sm text-base-content/70">
              {total === 1 ? '1 user' : `${total} users`}
            </div>
            <div className="flex items-center gap-(--space-2)">
              <select
                className="select select-bordered select-sm"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  setPage(1)
                }}
                data-testid={TID.adminUsers.pagination.rowsPerPage}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                data-testid={TID.adminUsers.pagination.prev}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                data-testid={TID.adminUsers.pagination.next}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <UserFormModal
        key={`create-${creating}`}
        open={creating}
        title="Create User"
        onOpenChange={setCreating}
        onSubmit={async (values) => {
          if (!values.password) {
            throw new Error('Password is required')
          }
          await createUser.mutateAsync(values as CreateAdminUser)
          setCreating(false)
        }}
        loading={createUser.isPending}
        mode="create"
      />

      <UserFormModal
        key={`edit-${editingUser?.id ?? 'none'}`}
        open={!!editingUser}
        title="Edit User"
        onOpenChange={(open) => !open && setEditingUser(null)}
        initialValues={editingUser ?? undefined}
        onSubmit={async (values) => {
          if (!editingUser) return
          const { password: _password, ...updateValues } = values as UserFormValues
          await updateUser.mutateAsync({ id: editingUser.id, body: updateValues })
          setEditingUser(null)
        }}
        loading={updateUser.isPending}
        mode="edit"
      />

      <ResetPasswordModal
        open={!!passwordUser}
        user={passwordUser}
        onOpenChange={(open) => !open && setPasswordUser(null)}
        onSubmit={async (newPassword) => {
          if (!passwordUser) return
          await resetPassword.mutateAsync({ id: passwordUser.id, body: { newPassword } })
          setPasswordUser(null)
        }}
        loading={resetPassword.isPending}
      />

      <StatusDialog
        open={!!statusUser}
        user={statusUser}
        onOpenChange={(open) => !open && setStatusUser(null)}
        onConfirm={async () => {
          if (!statusUser) return
          if (statusUser.disabled) {
            await enableUser.mutateAsync(statusUser.id)
          } else {
            await disableUser.mutateAsync(statusUser.id)
          }
          setStatusUser(null)
        }}
        loading={enableUser.isPending || disableUser.isPending}
      />
    </div>
  )
}

function UserFormModal({
  open,
  title,
  onOpenChange,
  onSubmit,
  loading,
  mode,
  initialValues,
}: {
  open: boolean
  title: string
  onOpenChange: (open: boolean) => void
  onSubmit: (values: UserFormValues) => Promise<void>
  loading: boolean
  mode: 'create' | 'edit'
  initialValues?: AdminUserResponse
}) {
  const [username, setUsername] = useState(initialValues?.username ?? '')
  const [displayName, setDisplayName] = useState(initialValues?.displayName ?? '')
  const [role, setRole] = useState<AdminUserResponse['role']>(
    initialValues?.role ?? 'quartermaster'
  )
  const [email, setEmail] = useState(initialValues?.email ?? '')
  const [firstName, setFirstName] = useState(initialValues?.firstName ?? '')
  const [lastName, setLastName] = useState(initialValues?.lastName ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'create' && password.length < 12) {
      setError('Password must be at least 12 characters')
      return
    }

    try {
      await onSubmit({
        username,
        displayName,
        role,
        email: email || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        ...(mode === 'create' ? { password } : {}),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new admin user account with role-based access.'
              : 'Update account details and role assignment.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-(--space-3)">
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-(--space-3) md:grid-cols-2">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Username</legend>
              <input
                type="text"
                className="input input-bordered w-full"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                data-testid={TID.adminUsers.form.username}
              />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Display Name</legend>
              <input
                type="text"
                className="input input-bordered w-full"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                data-testid={TID.adminUsers.form.displayName}
              />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Role</legend>
              <select
                className="select select-bordered w-full"
                value={role}
                onChange={(e) => setRole(e.target.value as AdminUserResponse['role'])}
                data-testid={TID.adminUsers.form.role}
              >
                <option value="quartermaster">Quartermaster</option>
                <option value="admin">Admin</option>
                <option value="developer">Developer</option>
              </select>
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Email</legend>
              <input
                type="email"
                className="input input-bordered w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid={TID.adminUsers.form.email}
              />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">First Name</legend>
              <input
                type="text"
                className="input input-bordered w-full"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                data-testid={TID.adminUsers.form.firstName}
              />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Last Name</legend>
              <input
                type="text"
                className="input input-bordered w-full"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                data-testid={TID.adminUsers.form.lastName}
              />
            </fieldset>
            {mode === 'create' && (
              <fieldset className="fieldset md:col-span-2">
                <legend className="fieldset-legend">Password</legend>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid={TID.adminUsers.form.password}
                />
              </fieldset>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              data-testid={TID.adminUsers.form.cancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              data-testid={TID.adminUsers.form.submit}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : mode === 'create' ? (
                'Create User'
              ) : (
                'Save Changes'
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ResetPasswordModal({
  open,
  user,
  onOpenChange,
  onSubmit,
  loading,
}: {
  open: boolean
  user: AdminUserResponse | null
  onOpenChange: (open: boolean) => void
  onSubmit: (password: string) => Promise<void>
  loading: boolean
}) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters')
      return
    }

    try {
      await onSubmit(newPassword)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Set a new password for <span className="font-semibold">{user?.username}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-(--space-3)">
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">New Password</legend>
            <input
              type="password"
              className="input input-bordered w-full"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              data-testid={TID.adminUsers.resetPassword.newPassword}
            />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Confirm Password</legend>
            <input
              type="password"
              className="input input-bordered w-full"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              data-testid={TID.adminUsers.resetPassword.confirmPassword}
            />
          </fieldset>
          <DialogFooter>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              data-testid={TID.adminUsers.resetPassword.cancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              data-testid={TID.adminUsers.resetPassword.submit}
            >
              {loading ? <span className="loading loading-spinner loading-sm" /> : 'Reset Password'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StatusDialog({
  open,
  user,
  onOpenChange,
  onConfirm,
  loading,
}: {
  open: boolean
  user: AdminUserResponse | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  loading: boolean
}) {
  const action = user?.disabled ? 'Enable' : 'Disable'
  const description = user?.disabled
    ? `Enable ${user.username} and restore account access.`
    : `Disable ${user?.username} and block sign-in.`

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{action} User</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid={TID.adminUsers.status.cancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              void onConfirm()
            }}
            disabled={loading}
            data-testid={TID.adminUsers.status.confirm}
            className={user?.disabled ? 'btn btn-success' : 'btn btn-warning'}
          >
            {loading ? <span className="loading loading-spinner loading-sm" /> : action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
