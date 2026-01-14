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
import type { MemberWithDivision, Division, CreateMemberInput, Tag } from '@shared/types';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  member: MemberWithDivision | null;
  divisions: Division[];
  tags: Tag[];
}

export default function MemberModal({
  isOpen,
  onClose,
  onSave,
  member,
  divisions,
  tags,
}: MemberModalProps) {
  const [formData, setFormData] = useState<Partial<CreateMemberInput>>({});
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<string>('active');

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
        status: member.status,
      });
      setStatus(member.status);
      setSelectedTagIds(new Set(member.tags?.map((tag) => tag.id) ?? []));
    } else {
      setFormData({
        memberType: 'class_a',
      });
      setStatus('active');
      setSelectedTagIds(new Set());
    }
    setError('');
  }, [member, isOpen]);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Prepare payload with tags and status
      const payload = {
        ...formData,
        status,
        tagIds: Array.from(selectedTagIds),
      };

      if (isEdit) {
        await api.put(`/members/${member.id}`, payload);
      } else {
        await api.post('/members', payload);
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
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
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
              description="Military service number (e.g., A12 345 678)"
              value={formData.serviceNumber ? formData.serviceNumber : ''}
              onValueChange={(v) => setFormData({ ...formData, serviceNumber: v })}
              isRequired
            />
            <Input
              label="Employee Number"
              description="DND employee number if applicable"
              value={formData.employeeNumber ? formData.employeeNumber : ''}
              onValueChange={(v) => setFormData({ ...formData, employeeNumber: v })}
            />
            <Input
              label="Rank"
              description="Current rank abbreviation (e.g., LS, MCpl, Lt(N))"
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
            <Input
              label="Initials"
              description="Member initials for short-form display"
              value={formData.initials ? formData.initials : ''}
              onValueChange={(v) => setFormData({ ...formData, initials: v })}
              maxLength={10}
            />
            <Select
              label="Division"
              description="Unit division/department"
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
                  memberType: Array.from(keys)[0] as 'class_a' | 'class_b' | 'class_c' | 'reg_force',
                })
              }
              isRequired
            >
              <SelectItem key="class_a" description="Part-time reservist">Class A</SelectItem>
              <SelectItem key="class_b" description="Full-time reservist">Class B</SelectItem>
              <SelectItem key="class_c" description="Deployed reservist">Class C</SelectItem>
              <SelectItem key="reg_force" description="Regular Force member">Reg Force</SelectItem>
            </Select>
            <Select
              label="Status"
              description="Member status in the system"
              selectedKeys={[status]}
              onSelectionChange={(keys) =>
                setStatus(Array.from(keys)[0] as string)
              }
            >
              <SelectItem key="active">Active</SelectItem>
              <SelectItem key="inactive">Inactive</SelectItem>
              <SelectItem key="pending_review">Pending Review</SelectItem>
              <SelectItem key="terminated">Terminated</SelectItem>
            </Select>
            <Select
              label="Mess"
              description="Mess membership for social functions"
              selectedKeys={formData.mess ? [formData.mess] : []}
              onSelectionChange={(keys) =>
                setFormData({ ...formData, mess: Array.from(keys)[0] as string })
              }
            >
              <SelectItem key="Junior Ranks">Junior Ranks</SelectItem>
              <SelectItem key="Wardroom">Wardroom</SelectItem>
              <SelectItem key="C&POs">C&POs</SelectItem>
            </Select>
            <Input
              label="MOC"
              description="Military Occupation Code"
              value={formData.moc ? formData.moc : ''}
              onValueChange={(v) => setFormData({ ...formData, moc: v })}
            />
            <Input
              label="Class Details"
              description="Additional employment details"
              value={formData.classDetails ? formData.classDetails : ''}
              onValueChange={(v) => setFormData({ ...formData, classDetails: v })}
            />
            <Input
              label="Email"
              type="email"
              value={formData.email ? formData.email : ''}
              onValueChange={(v) => setFormData({ ...formData, email: v })}
            />
            <Input
              label="Home Phone"
              value={formData.homePhone ? formData.homePhone : ''}
              onValueChange={(v) => setFormData({ ...formData, homePhone: v })}
            />
            <Input
              label="Mobile Phone"
              value={formData.mobilePhone ? formData.mobilePhone : ''}
              onValueChange={(v) => setFormData({ ...formData, mobilePhone: v })}
            />
          </div>
          <Select
            label="Tags"
            description="Operational tags for grouping and filtering"
            selectionMode="multiple"
            selectedKeys={selectedTagIds}
            onSelectionChange={(keys) => {
              setSelectedTagIds(new Set(Array.from(keys) as string[]));
            }}
            className="col-span-2"
          >
            {tags.map((tag) => (
              <SelectItem key={tag.id} description={tag.description}>
                {tag.name}
              </SelectItem>
            ))}
          </Select>
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
