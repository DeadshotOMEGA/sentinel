import { useState, useEffect } from 'react';
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
} from '@heroui/react';
import { api } from '../lib/api';
import type { MemberWithDivision, Division, CreateMemberInput } from '@shared/types';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  member: MemberWithDivision | null;
  divisions: Division[];
}

export default function MemberModal({
  isOpen,
  onClose,
  onSave,
  member,
  divisions,
}: MemberModalProps) {
  const [formData, setFormData] = useState<Partial<CreateMemberInput>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!member;

  useEffect(() => {
    if (member) {
      setFormData({
        serviceNumber: member.serviceNumber,
        firstName: member.firstName,
        lastName: member.lastName,
        rank: member.rank,
        divisionId: member.divisionId,
        memberType: member.memberType as 'full-time' | 'reserve',
        email: member.email,
        phone: member.phone,
      });
    } else {
      setFormData({
        memberType: 'reserve',
      });
    }
    setError('');
  }, [member, isOpen]);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    try {
      if (isEdit) {
        await api.put(`/members/${member.id}`, formData);
      } else {
        await api.post('/members', formData);
      }
      onSave();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = error.response?.data?.error?.message;
      if (!errorMessage) {
        throw new Error('Failed to save member');
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        <ModalHeader>{isEdit ? 'Edit Member' : 'Add Member'}</ModalHeader>
        <ModalBody>
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Service Number"
              value={formData.serviceNumber ? formData.serviceNumber : ''}
              onValueChange={(v) => setFormData({ ...formData, serviceNumber: v })}
              isRequired
            />
            <Input
              label="Rank"
              value={formData.rank ? formData.rank : ''}
              onValueChange={(v) => setFormData({ ...formData, rank: v })}
              isRequired
            />
            <Input
              label="First Name"
              value={formData.firstName ? formData.firstName : ''}
              onValueChange={(v) => setFormData({ ...formData, firstName: v })}
              isRequired
            />
            <Input
              label="Last Name"
              value={formData.lastName ? formData.lastName : ''}
              onValueChange={(v) => setFormData({ ...formData, lastName: v })}
              isRequired
            />
            <Select
              label="Division"
              selectedKeys={formData.divisionId ? [formData.divisionId] : []}
              onSelectionChange={(keys) =>
                setFormData({ ...formData, divisionId: Array.from(keys)[0] as string })
              }
              isRequired
            >
              {divisions.map((d) => (
                <SelectItem key={d.id}>{d.name}</SelectItem>
              ))}
            </Select>
            <Select
              label="Member Type"
              selectedKeys={formData.memberType ? [formData.memberType] : []}
              onSelectionChange={(keys) =>
                setFormData({
                  ...formData,
                  memberType: Array.from(keys)[0] as 'full-time' | 'reserve',
                })
              }
              isRequired
            >
              <SelectItem key="full-time">Full-Time</SelectItem>
              <SelectItem key="reserve">Reserve</SelectItem>
            </Select>
            <Input
              label="Email"
              type="email"
              value={formData.email ? formData.email : ''}
              onValueChange={(v) => setFormData({ ...formData, email: v })}
            />
            <Input
              label="Phone"
              value={formData.phone ? formData.phone : ''}
              onValueChange={(v) => setFormData({ ...formData, phone: v })}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>
            {isEdit ? 'Save Changes' : 'Add Member'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
