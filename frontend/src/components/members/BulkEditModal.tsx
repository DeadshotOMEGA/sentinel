import { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Chip,
  Divider,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { api } from '../../lib/api';
import type { Division, Tag, MemberType, MemberStatus } from '@shared/types';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedMemberIds: string[];
  divisions: Division[];
  tags: Tag[];
}

interface BulkEditFormData {
  rank: string;
  divisionId: string;
  memberType: MemberType;
  mess: string;
  moc: string;
  classDetails: string;
  tagIds: string[];
  status: MemberStatus;
}

type EditableField = keyof BulkEditFormData;

const MEMBER_TYPE_OPTIONS: { key: MemberType; label: string; description: string }[] = [
  { key: 'class_a', label: 'Class A', description: 'Part-time reservist' },
  { key: 'class_b', label: 'Class B', description: 'Full-time reservist' },
  { key: 'class_c', label: 'Class C', description: 'Deployed reservist' },
  { key: 'reg_force', label: 'Reg Force', description: 'Regular Force member' },
];

const MESS_OPTIONS = ['Junior Ranks', 'Wardroom', 'C&POs'];

const STATUS_OPTIONS: { key: MemberStatus; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'pending_review', label: 'Pending Review' },
  { key: 'terminated', label: 'Terminated' },
];

const STATUS_COLORS: Record<MemberStatus, 'success' | 'default' | 'warning' | 'danger'> = {
  active: 'success',
  inactive: 'default',
  pending_review: 'warning',
  terminated: 'danger',
};

const FIELD_LABELS: Record<EditableField, string> = {
  rank: 'Rank',
  divisionId: 'Division',
  memberType: 'Member Type',
  mess: 'Mess',
  moc: 'MOC',
  classDetails: 'Class Details',
  tagIds: 'Tags',
  status: 'Status',
};

export default function BulkEditModal({
  isOpen,
  onClose,
  onSave,
  selectedMemberIds,
  divisions,
  tags,
}: BulkEditModalProps) {
  const [formData, setFormData] = useState<Partial<BulkEditFormData>>({});
  const [changedFields, setChangedFields] = useState<Set<EditableField>>(new Set());
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({});
      setChangedFields(new Set());
      setShowConfirmation(false);
      setError('');
    }
  }, [isOpen]);

  const handleFieldChange = <K extends EditableField>(field: K, value: BulkEditFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setChangedFields((prev) => new Set(prev).add(field));
  };

  const handleTagsChange = (selectedKeys: Set<string>) => {
    const tagIds = Array.from(selectedKeys);
    setFormData((prev) => ({ ...prev, tagIds }));
    setChangedFields((prev) => new Set(prev).add('tagIds'));
  };

  const getDisplayValue = (field: EditableField): string => {
    const value = formData[field];
    if (value === undefined || value === '') return '';

    switch (field) {
      case 'divisionId': {
        const division = divisions.find((d) => d.id === value);
        return division?.name ?? String(value);
      }
      case 'memberType': {
        const type = MEMBER_TYPE_OPTIONS.find((t) => t.key === value);
        return type?.label ?? String(value);
      }
      case 'status': {
        const status = STATUS_OPTIONS.find((s) => s.key === value);
        return status?.label ?? String(value);
      }
      case 'tagIds': {
        const tagIds = value as string[];
        const tagNames = tagIds
          .map((id) => tags.find((t) => t.id === id)?.name)
          .filter(Boolean);
        return tagNames.join(', ');
      }
      default:
        return String(value);
    }
  };

  const confirmationItems = useMemo(() => {
    return Array.from(changedFields).map((field) => ({
      field,
      label: FIELD_LABELS[field],
      value: getDisplayValue(field),
    }));
  }, [changedFields, formData, divisions, tags]);

  const handleReviewChanges = () => {
    if (changedFields.size === 0) {
      setError('Please modify at least one field before saving.');
      return;
    }
    setError('');
    setShowConfirmation(true);
  };

  const handleBackToEdit = () => {
    setShowConfirmation(false);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Build updates object with only changed fields
      const updates: Record<string, unknown> = {};
      for (const field of changedFields) {
        updates[field] = formData[field];
      }

      await api.patch('/members/bulk', {
        memberIds: selectedMemberIds,
        updates,
      });

      onSave();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = error.response?.data?.error?.message;
      if (!errorMessage) {
        throw new Error('Failed to update members');
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const memberCount = selectedMemberIds.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Icon icon="solar:pen-2-linear" width={24} />
            <span>Bulk Edit Members</span>
          </div>
          <p className="text-sm font-normal text-default-500">
            Editing {memberCount} selected member{memberCount !== 1 ? 's' : ''}
          </p>
        </ModalHeader>

        <ModalBody>
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          {!showConfirmation ? (
            <>
              {/* Info banner about disabled fields */}
              <div className="mb-4 rounded-lg bg-default-100 p-3 text-sm text-default-600">
                <div className="flex items-start gap-2">
                  <Icon icon="solar:info-circle-linear" width={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Personal identifiers cannot be bulk edited</p>
                    <p className="text-default-500">
                      Service Number, Employee Number, First Name, Last Name, Initials, Email, and
                      Phone numbers must be edited individually.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Rank"
                  description="Current rank abbreviation"
                  value={formData.rank ?? ''}
                  onValueChange={(v) => handleFieldChange('rank', v)}
                  startContent={
                    changedFields.has('rank') && (
                      <Chip size="sm" color="primary" variant="flat" className="h-5">
                        Modified
                      </Chip>
                    )
                  }
                />

                <Select
                  label="Division"
                  description="Unit division/department"
                  selectedKeys={formData.divisionId ? [formData.divisionId] : []}
                  onSelectionChange={(keys) =>
                    handleFieldChange('divisionId', Array.from(keys)[0] as string)
                  }
                  startContent={
                    changedFields.has('divisionId') && (
                      <Chip size="sm" color="primary" variant="flat" className="h-5">
                        Modified
                      </Chip>
                    )
                  }
                >
                  {divisions.map((d) => (
                    <SelectItem key={d.id}>{d.name}</SelectItem>
                  ))}
                </Select>

                <Select
                  label="Member Type"
                  selectedKeys={formData.memberType ? [formData.memberType] : []}
                  onSelectionChange={(keys) =>
                    handleFieldChange('memberType', Array.from(keys)[0] as MemberType)
                  }
                  startContent={
                    changedFields.has('memberType') && (
                      <Chip size="sm" color="primary" variant="flat" className="h-5">
                        Modified
                      </Chip>
                    )
                  }
                >
                  {MEMBER_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type.key} description={type.description}>
                      {type.label}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  label="Mess"
                  description="Mess membership"
                  selectedKeys={formData.mess ? [formData.mess] : []}
                  onSelectionChange={(keys) =>
                    handleFieldChange('mess', Array.from(keys)[0] as string)
                  }
                  startContent={
                    changedFields.has('mess') && (
                      <Chip size="sm" color="primary" variant="flat" className="h-5">
                        Modified
                      </Chip>
                    )
                  }
                >
                  {MESS_OPTIONS.map((mess) => (
                    <SelectItem key={mess}>{mess}</SelectItem>
                  ))}
                </Select>

                <Input
                  label="MOC"
                  description="Military Occupation Code"
                  value={formData.moc ?? ''}
                  onValueChange={(v) => handleFieldChange('moc', v)}
                  startContent={
                    changedFields.has('moc') && (
                      <Chip size="sm" color="primary" variant="flat" className="h-5">
                        Modified
                      </Chip>
                    )
                  }
                />

                <Input
                  label="Class Details"
                  description="Additional employment details"
                  value={formData.classDetails ?? ''}
                  onValueChange={(v) => handleFieldChange('classDetails', v)}
                  startContent={
                    changedFields.has('classDetails') && (
                      <Chip size="sm" color="primary" variant="flat" className="h-5">
                        Modified
                      </Chip>
                    )
                  }
                />

                <Select
                  label="Status"
                  description="Member status in the system"
                  selectedKeys={formData.status ? [formData.status] : []}
                  onSelectionChange={(keys) =>
                    handleFieldChange('status', Array.from(keys)[0] as MemberStatus)
                  }
                  startContent={
                    changedFields.has('status') && (
                      <Chip size="sm" color="primary" variant="flat" className="h-5">
                        Modified
                      </Chip>
                    )
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.key}>{status.label}</SelectItem>
                  ))}
                </Select>
              </div>

              <Select
                label="Tags"
                description="Operational tags for grouping and filtering"
                selectionMode="multiple"
                selectedKeys={new Set(formData.tagIds ?? [])}
                onSelectionChange={(keys) => handleTagsChange(keys as Set<string>)}
                className="mt-4"
                startContent={
                  changedFields.has('tagIds') && (
                    <Chip size="sm" color="primary" variant="flat" className="h-5">
                      Modified
                    </Chip>
                  )
                }
              >
                {tags.map((tag) => (
                  <SelectItem key={tag.id} description={tag.description}>
                    {tag.name}
                  </SelectItem>
                ))}
              </Select>
            </>
          ) : (
            <>
              {/* Confirmation view */}
              <div className="mb-4 rounded-lg bg-warning-50 p-3 text-sm text-warning-700">
                <div className="flex items-start gap-2">
                  <Icon icon="solar:danger-triangle-linear" width={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Please review your changes</p>
                    <p>
                      The following changes will be applied to {memberCount} member
                      {memberCount !== 1 ? 's' : ''}.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {confirmationItems.map(({ field, label, value }) => (
                  <div
                    key={field}
                    className="flex items-center justify-between rounded-lg bg-default-50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Icon icon="solar:pen-2-linear" width={18} className="text-primary" />
                      <span className="font-medium">{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-default-500">
                        {memberCount} member{memberCount !== 1 ? 's' : ''} will have {label.toLowerCase()} changed to
                      </span>
                      {field === 'status' ? (
                        <Chip
                          size="sm"
                          color={STATUS_COLORS[formData.status as MemberStatus]}
                          variant="flat"
                        >
                          {value}
                        </Chip>
                      ) : (
                        <Chip size="sm" color="primary" variant="flat">
                          {value || '(empty)'}
                        </Chip>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Divider className="my-4" />

              <div className="rounded-lg bg-default-100 p-3 text-center text-sm text-default-600">
                <p>
                  <strong>{changedFields.size}</strong> field{changedFields.size !== 1 ? 's' : ''}{' '}
                  will be updated across <strong>{memberCount}</strong> member
                  {memberCount !== 1 ? 's' : ''}
                </p>
              </div>
            </>
          )}
        </ModalBody>

        <ModalFooter>
          {!showConfirmation ? (
            <>
              <Button variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleReviewChanges}
                isDisabled={changedFields.size === 0}
              >
                Review Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="light" onPress={handleBackToEdit}>
                Back to Edit
              </Button>
              <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>
                Apply Changes to {memberCount} Member{memberCount !== 1 ? 's' : ''}
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
