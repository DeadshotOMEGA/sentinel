import { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Button,
  Select,
  SelectItem,
} from './ui/heroui-polyfills';
import { api } from '../lib/api';
import type { MemberWithDivision, Division, CreateMemberInput } from '@shared/types';

interface MemberModalProps {
  isOpen: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  onSave: () => void;
  onClose?: () => void;
  member: MemberWithDivision | null;
  divisions: Division[];
}

export default function MemberModal({
  isOpen,
  onOpenChange,
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
        employeeNumber: member.employeeNumber,
        firstName: member.firstName,
        lastName: member.lastName,
        initials: member.initials,
        rank: member.rank,
        divisionId: member.divisionId,
        mess: member.mess,
        moc: member.moc,
        memberType: member.memberType,
        classDetails: member.classDetails,
        email: member.email,
        homePhone: member.homePhone,
        mobilePhone: member.mobilePhone,
      });
    } else {
      setFormData({
        memberType: 'class_a',
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
      onOpenChange?.(false);
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
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
      <ModalContent>
        {(onClose) => (
          <>
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
                  value={formData.serviceNumber || ''}
                  onValueChange={(v) => setFormData({ ...formData, serviceNumber: v })}
                  isRequired
                />
                <Input
                  label="Employee Number"
                  value={formData.employeeNumber || ''}
                  onValueChange={(v) => setFormData({ ...formData, employeeNumber: v })}
                />
                <Input
                  label="Rank"
                  value={formData.rank || ''}
                  onValueChange={(v) => setFormData({ ...formData, rank: v })}
                  isRequired
                />
                <Input
                  label="First Name"
                  value={formData.firstName || ''}
                  onValueChange={(v) => setFormData({ ...formData, firstName: v })}
                  isRequired
                />
                <Input
                  label="Last Name"
                  value={formData.lastName || ''}
                  onValueChange={(v) => setFormData({ ...formData, lastName: v })}
                  isRequired
                />
                <Input
                  label="Initials"
                  value={formData.initials || ''}
                  onValueChange={(v) => setFormData({ ...formData, initials: v })}
                  maxLength={10}
                />
                <Select
                  label="Division"
                  selectedKeys={formData.divisionId ? [formData.divisionId] : []}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string;
                    setFormData({ ...formData, divisionId: selectedKey });
                  }}
                  isRequired
                >
                  {divisions.map((d) => (
                    <SelectItem key={d.id}>{d.name}</SelectItem>
                  ))}
                </Select>
                <Select
                  label="Member Type"
                  selectedKeys={formData.memberType ? [formData.memberType] : []}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string;
                    setFormData({ ...formData, memberType: selectedKey as 'class_a' | 'class_b' | 'class_c' | 'reg_force' });
                  }}
                  isRequired
                >
                  <SelectItem key="class_a">Class A</SelectItem>
                  <SelectItem key="class_b">Class B</SelectItem>
                  <SelectItem key="class_c">Class C</SelectItem>
                  <SelectItem key="reg_force">Reg Force</SelectItem>
                </Select>
                <Select
                  label="Mess"
                  selectedKeys={formData.mess ? [formData.mess] : []}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string;
                    setFormData({ ...formData, mess: selectedKey });
                  }}
                >
                  <SelectItem key="Junior Ranks">Junior Ranks</SelectItem>
                  <SelectItem key="Wardroom">Wardroom</SelectItem>
                  <SelectItem key="C&POs">C&POs</SelectItem>
                </Select>
                <Input
                  label="MOC"
                  value={formData.moc || ''}
                  onValueChange={(v) => setFormData({ ...formData, moc: v })}
                />
                <Input
                  label="Class Details"
                  value={formData.classDetails || ''}
                  onValueChange={(v) => setFormData({ ...formData, classDetails: v })}
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email || ''}
                  onValueChange={(v) => setFormData({ ...formData, email: v })}
                />
                <Input
                  label="Home Phone"
                  value={formData.homePhone || ''}
                  onValueChange={(v) => setFormData({ ...formData, homePhone: v })}
                />
                <Input
                  label="Mobile Phone"
                  value={formData.mobilePhone || ''}
                  onValueChange={(v) => setFormData({ ...formData, mobilePhone: v })}
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
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
