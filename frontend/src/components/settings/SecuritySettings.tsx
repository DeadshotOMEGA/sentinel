import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Select,
  SelectItem,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { format } from 'date-fns';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import { useAuth } from '../../hooks/useAuth';
import type { AdminUser, AdminRole } from '../../../../shared/types';
import UserModal from './UserModal';
import ResetPasswordModal from './ResetPasswordModal';
import AuditLogViewer from './AuditLogViewer';

type SortBy = 'username' | 'role' | 'lastLogin';
type SortOrder = 'asc' | 'desc';
type RoleFilter = 'all' | AdminRole;
type StatusFilter = 'all' | 'active' | 'disabled';
type ModalType = 'create' | 'edit' | 'resetPassword' | null;

const ROLE_COLORS: Record<AdminRole, 'default' | 'primary' | 'secondary'> = {
  quartermaster: 'default',
  admin: 'primary',
  developer: 'secondary',
};

const ROLE_LABELS: Record<AdminRole, string> = {
  quartermaster: 'Quartermaster',
  admin: 'Admin',
  developer: 'Developer',
};

interface AdminUsersResponse {
  users: AdminUser[];
}

export default function SecuritySettings() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [sortBy, setSortBy] = useState<SortBy>('username');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);

  // Query
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await api.get<AdminUsersResponse>('/admin-users');
      return response.data.users;
    },
  });

  // Mutations
  const disableMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin-users/${id}/disable`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDisableConfirmOpen(false);
      setSelectedUser(null);
      toast.success('User disabled successfully');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      const message = err.response?.data?.error?.message || 'Failed to disable user';
      toast.error(message);
    },
  });

  const enableMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin-users/${id}/enable`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User enabled successfully');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      const message = err.response?.data?.error?.message || 'Failed to enable user';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin-users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteConfirmOpen(false);
      setSelectedUser(null);
      toast.success('User deleted successfully');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      const message = err.response?.data?.error?.message || 'Failed to delete user';
      toast.error(message);
    },
  });

  // Filtering and sorting
  const filteredUsers = useMemo(() => {
    if (!data) return [];

    return data
      .filter((u) => {
        if (roleFilter !== 'all' && u.role !== roleFilter) return false;
        if (statusFilter === 'active' && u.disabled) return false;
        if (statusFilter === 'disabled' && !u.disabled) return false;
        return true;
      })
      .sort((a, b) => {
        let comparison = 0;

        if (sortBy === 'username') {
          comparison = a.username.localeCompare(b.username);
        } else if (sortBy === 'role') {
          comparison = a.role.localeCompare(b.role);
        } else if (sortBy === 'lastLogin') {
          const aTime = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          const bTime = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          comparison = aTime - bTime;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [data, roleFilter, statusFilter, sortBy, sortOrder]);

  // Count developers for validation
  const developerCount = useMemo(() => {
    return data?.filter((u) => u.role === 'developer' && !u.disabled).length ?? 0;
  }, [data]);

  // Validation helpers
  const canDelete = (user: AdminUser): boolean => {
    if (user.id === currentUser?.id) return false;
    if (user.role === 'developer' && developerCount <= 1) return false;
    return true;
  };

  const canDisable = (user: AdminUser): boolean => {
    if (user.id === currentUser?.id) return false;
    if (user.role === 'developer' && developerCount <= 1) return false;
    return true;
  };

  // Handlers
  const handleCreateUser = () => {
    setSelectedUser(null);
    setModalType('create');
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setModalType('edit');
  };

  const handleDisableUser = (user: AdminUser) => {
    if (!canDisable(user)) {
      if (user.id === currentUser?.id) {
        toast.error('You cannot disable your own account');
      } else {
        toast.error('Cannot disable the last developer account');
      }
      return;
    }
    setSelectedUser(user);
    setDisableConfirmOpen(true);
  };

  const handleEnableUser = (user: AdminUser) => {
    enableMutation.mutate(user.id);
  };

  const handleResetPassword = (user: AdminUser) => {
    setSelectedUser(user);
    setModalType('resetPassword');
  };

  const handleDeleteUser = (user: AdminUser) => {
    if (!canDelete(user)) {
      if (user.id === currentUser?.id) {
        toast.error('You cannot delete your own account');
      } else {
        toast.error('Cannot delete the last developer account');
      }
      return;
    }
    setSelectedUser(user);
    setDeleteConfirmOpen(true);
  };

  const handleUserModalSave = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    setModalType(null);
    setSelectedUser(null);
    toast.success(modalType === 'create' ? 'User created successfully' : 'User updated successfully');
  };

  const handleResetPasswordSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    setModalType(null);
    setSelectedUser(null);
    toast.success('Password reset successfully');
  };

  const handleConfirmDisable = () => {
    if (selectedUser) {
      disableMutation.mutate(selectedUser.id);
    }
  };

  const handleConfirmDelete = () => {
    if (selectedUser) {
      deleteMutation.mutate(selectedUser.id);
    }
  };

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Management Section */}
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex items-center justify-between w-full">
            <div>
              <h3 className="text-lg font-semibold">User Management</h3>
              <p className="text-sm text-default-500">
                Manage admin user accounts and permissions
              </p>
            </div>
            <Button
              color="primary"
              startContent={<Icon icon="solar:add-circle-linear" width={20} />}
              onPress={handleCreateUser}
            >
              Add User
            </Button>
          </div>
          <div className="flex gap-3">
            <Select
              label="Role"
              selectedKeys={[roleFilter]}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              className="w-40"
              size="sm"
            >
              <SelectItem key="all">All Roles</SelectItem>
              <SelectItem key="quartermaster">Quartermaster</SelectItem>
              <SelectItem key="admin">Admin</SelectItem>
              <SelectItem key="developer">Developer</SelectItem>
            </Select>
            <Select
              label="Status"
              selectedKeys={[statusFilter]}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-36"
              size="sm"
            >
              <SelectItem key="all">All Status</SelectItem>
              <SelectItem key="active">Active</SelectItem>
              <SelectItem key="disabled">Disabled</SelectItem>
            </Select>
          </div>
        </CardHeader>
        <CardBody>
          <Table aria-label="Admin users table">
            <TableHeader>
              <TableColumn
                allowsSorting
                onClick={() => handleSort('username')}
                className="cursor-pointer"
              >
                <span className="flex items-center gap-1">
                  USERNAME
                  {sortBy === 'username' && (
                    <Icon
                      icon={sortOrder === 'asc' ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                      width={14}
                    />
                  )}
                </span>
              </TableColumn>
              <TableColumn>DISPLAY NAME</TableColumn>
              <TableColumn
                allowsSorting
                onClick={() => handleSort('role')}
                className="cursor-pointer"
              >
                <span className="flex items-center gap-1">
                  ROLE
                  {sortBy === 'role' && (
                    <Icon
                      icon={sortOrder === 'asc' ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                      width={14}
                    />
                  )}
                </span>
              </TableColumn>
              <TableColumn
                allowsSorting
                onClick={() => handleSort('lastLogin')}
                className="cursor-pointer"
              >
                <span className="flex items-center gap-1">
                  LAST LOGIN
                  {sortBy === 'lastLogin' && (
                    <Icon
                      icon={sortOrder === 'asc' ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                      width={14}
                    />
                  )}
                </span>
              </TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn align="end">ACTIONS</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No users found">
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <span className="font-medium">{user.username}</span>
                  </TableCell>
                  <TableCell>
                    {user.displayName}
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" color={ROLE_COLORS[user.role]} variant="flat">
                      {ROLE_LABELS[user.role]}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    {user.lastLogin ? (
                      format(new Date(user.lastLogin), 'MMM d, yyyy HH:mm')
                    ) : (
                      <span className="text-default-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      color={user.disabled ? 'danger' : 'success'}
                      variant="flat"
                    >
                      {user.disabled ? 'Disabled' : 'Active'}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Dropdown>
                      <DropdownTrigger>
                        <Button isIconOnly size="sm" variant="light" aria-label="Actions">
                          <Icon icon="solar:menu-dots-bold" width={20} />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="User actions">
                        <DropdownItem
                          key="edit"
                          startContent={<Icon icon="solar:pen-linear" width={18} />}
                          onPress={() => handleEditUser(user)}
                        >
                          Edit
                        </DropdownItem>
                        {user.disabled ? (
                          <DropdownItem
                            key="enable"
                            startContent={<Icon icon="solar:check-circle-linear" width={18} />}
                            onPress={() => handleEnableUser(user)}
                          >
                            Enable
                          </DropdownItem>
                        ) : (
                          <DropdownItem
                            key="disable"
                            startContent={<Icon icon="solar:close-circle-linear" width={18} />}
                            onPress={() => handleDisableUser(user)}
                            className={!canDisable(user) ? 'text-default-300' : ''}
                          >
                            Disable
                          </DropdownItem>
                        )}
                        <DropdownItem
                          key="reset-password"
                          startContent={<Icon icon="solar:key-linear" width={18} />}
                          onPress={() => handleResetPassword(user)}
                        >
                          Reset Password
                        </DropdownItem>
                        {currentUser?.role === 'developer' ? (
                          <DropdownItem
                            key="delete"
                            startContent={<Icon icon="solar:trash-bin-trash-linear" width={18} />}
                            color="danger"
                            onPress={() => handleDeleteUser(user)}
                            className={!canDelete(user) ? 'text-default-300' : ''}
                          >
                            Delete
                          </DropdownItem>
                        ) : null}
                      </DropdownMenu>
                    </Dropdown>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Audit Log Section */}
      <AuditLogViewer />

      {/* User Modal */}
      <UserModal
        isOpen={modalType === 'create' || modalType === 'edit'}
        onClose={() => {
          setModalType(null);
          setSelectedUser(null);
        }}
        onSave={handleUserModalSave}
        user={modalType === 'edit' ? selectedUser : null}
        currentUserRole={currentUser?.role ?? 'quartermaster'}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={modalType === 'resetPassword'}
        onClose={() => {
          setModalType(null);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSuccess={handleResetPasswordSuccess}
      />

      {/* Disable Confirmation Modal */}
      <Modal isOpen={disableConfirmOpen} onClose={() => setDisableConfirmOpen(false)}>
        <ModalContent>
          <ModalHeader>Disable User</ModalHeader>
          <ModalBody>
            <p>
              Are you sure you want to disable user{' '}
              <strong>{selectedUser?.username}</strong>?
            </p>
            <p className="text-sm text-default-500 mt-2">
              The user will no longer be able to log in. You can re-enable them at any time.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setDisableConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              color="warning"
              onPress={handleConfirmDisable}
              isLoading={disableMutation.isPending}
            >
              Disable User
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <ModalContent>
          <ModalHeader>Delete User</ModalHeader>
          <ModalBody>
            <p>
              Are you sure you want to delete user{' '}
              <strong>{selectedUser?.username}</strong>?
            </p>
            <p className="text-sm text-danger mt-2">
              This action cannot be undone. All user data will be permanently removed.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              color="danger"
              onPress={handleConfirmDelete}
              isLoading={deleteMutation.isPending}
            >
              Delete User
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
