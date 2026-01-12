import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Spinner,
  Chip,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { api } from '../../lib/api';

interface EventRolesResponse {
  roles: string[];
}

export default function EventRolesSettings() {
  const [editMode, setEditMode] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['event-roles'],
    queryFn: async () => {
      const response = await api.get<EventRolesResponse>('/settings/event-roles');
      return response.data;
    },
    onSuccess: (data) => {
      setRoles(data.roles);
    },
  });

  const updateRolesMutation = useMutation({
    mutationFn: (updatedRoles: string[]) =>
      api.put('/settings/event-roles', { roles: updatedRoles }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-roles'] });
      setEditMode(false);
    },
  });

  const handleAddRole = () => {
    if (newRole.trim() && !roles.includes(newRole.trim())) {
      setRoles([...roles, newRole.trim()]);
      setNewRole('');
    }
  };

  const handleRemoveRole = (roleToRemove: string) => {
    setRoles(roles.filter((r) => r !== roleToRemove));
  };

  const handleSave = () => {
    updateRolesMutation.mutate(roles);
  };

  const handleCancel = () => {
    if (data) {
      setRoles(data.roles);
    }
    setEditMode(false);
    setNewRole('');
  };

  const handleEdit = () => {
    if (data) {
      setRoles(data.roles);
    }
    setEditMode(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Default Event Roles</h3>
          <p className="text-sm text-gray-600 mt-1">
            Define default roles for event attendees. These can be overridden per event.
          </p>
        </div>
        {!editMode && (
          <Button color="primary" variant="flat" onPress={handleEdit}>
            Edit Roles
          </Button>
        )}
      </CardHeader>
      <CardBody>
        {editMode ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter new role name"
                value={newRole}
                onValueChange={setNewRole}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddRole();
                  }
                }}
                className="flex-1"
              />
              <Button color="primary" onPress={handleAddRole} isDisabled={!newRole.trim()}>
                Add Role
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <Chip
                  key={role}
                  onClose={() => handleRemoveRole(role)}
                  variant="flat"
                  color="primary"
                >
                  {role}
                </Chip>
              ))}
            </div>

            {roles.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No roles defined. Add at least one role.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="light" onPress={handleCancel}>
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleSave}
                isLoading={updateRolesMutation.isPending}
                isDisabled={roles.length === 0}
              >
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data?.roles.map((role) => (
              <Chip key={role} variant="flat" color="default">
                {role}
              </Chip>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
