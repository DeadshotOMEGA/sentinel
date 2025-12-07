import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  Button,
  Chip,
  Card,
  CardBody,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import MemberModal from '../MemberModal';
import TagChip from './TagChip';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import type { MemberWithDivision, Division, Tag, MemberStatus } from '@shared/types';

interface MemberQuickViewProps {
  isOpen: boolean;
  onClose: () => void;
  initialMember: MemberWithDivision;
  divisions: Division[];
  tags: Tag[];
}

const drawerMotionProps = {
  variants: {
    enter: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1], // ease-in-out
      },
    },
    exit: {
      x: '100%',
      opacity: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  },
};

const backdropMotionProps = {
  variants: {
    enter: {
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  },
};

export default function MemberQuickView({
  isOpen,
  onClose,
  initialMember,
  divisions,
  tags,
}: MemberQuickViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch fresh member data in background
  const { data: memberData } = useQuery({
    queryKey: ['member', initialMember.id],
    queryFn: async () => {
      const response = await api.get<{ member: MemberWithDivision }>(`/members/${initialMember.id}`);
      return response.data;
    },
    enabled: isOpen,
    initialData: { member: initialMember },
  });

  const member = memberData?.member || initialMember;

  // Delete member mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return api.delete(`/members/${member.id}`);
    },
    onSuccess: () => {
      toast.success('Member deleted');
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onClose();
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      const message = error.response?.data?.error?.message || 'Failed to delete member';
      toast.error(message);
    },
  });

  const handleViewFullDetails = () => {
    navigate(`/members/${member.id}`);
    onClose();
  };

  const handleDelete = () => {
    deleteMutation.mutate();
    setIsDeleteModalOpen(false);
  };

  const handleEditSave = () => {
    queryClient.invalidateQueries({ queryKey: ['member', member.id] });
    queryClient.invalidateQueries({ queryKey: ['members'] });
    setIsEditModalOpen(false);
    toast.success('Member updated');
  };

  const getMemberStatusColor = (status: MemberStatus): 'success' | 'default' | 'warning' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'pending_review':
        return 'warning';
    }
  };

  const getMemberTypeColor = (
    type: 'class_a' | 'class_b' | 'class_c' | 'reg_force'
  ): 'default' | 'success' | 'warning' | 'primary' => {
    switch (type) {
      case 'class_a':
        return 'default';
      case 'class_b':
        return 'success';
      case 'class_c':
        return 'warning';
      case 'reg_force':
        return 'primary';
    }
  };

  const getMemberTypeLabel = (type: 'class_a' | 'class_b' | 'class_c' | 'reg_force'): string => {
    switch (type) {
      case 'class_a':
        return 'Class A';
      case 'class_b':
        return 'Class B';
      case 'class_c':
        return 'Class C';
      case 'reg_force':
        return 'Reg Force';
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getContractWarning = (contractEnd?: Date) => {
    if (!contractEnd) return null;
    const daysUntilExpiry = Math.ceil(
      (new Date(contractEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry < 0) return 'danger';
    if (daysUntilExpiry <= 30) return 'warning';
    return null;
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        size="4xl"
        placement="right"
        backdrop="blur"
        motionProps={drawerMotionProps}
        backdropProps={{
          motionProps: backdropMotionProps,
        }}
      >
        <DrawerContent>
          <DrawerHeader className="flex flex-col gap-1 border-b border-divider">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Chip color={getMemberStatusColor(member.status)} variant="flat" size="sm">
                  {member.status === 'active'
                    ? 'Active'
                    : member.status === 'inactive'
                    ? 'Inactive'
                    : 'ED&T'}
                </Chip>
                <h2 className="text-xl font-semibold">
                  {member.rank} {member.lastName}, {member.firstName}
                </h2>
              </div>
              <Button
                isIconOnly
                variant="light"
                onPress={onClose}
                aria-label="Close drawer"
              >
                <Icon icon="solar:close-linear" width={24} />
              </Button>
            </div>
            <p className="font-mono text-sm text-default-500">SN: {member.serviceNumber}</p>
          </DrawerHeader>

          <DrawerBody className="gap-6 py-6">
            {/* Military Profile Card */}
            <Card>
              <CardBody>
                <h3 className="mb-4 text-lg font-semibold">Military Profile</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-default-500">Rank</p>
                    <p className="text-base">{member.rank}</p>
                  </div>
                  <div>
                    <p className="text-sm text-default-500">Division</p>
                    <Chip size="sm" variant="flat">
                      {member.division.name}
                    </Chip>
                  </div>
                  {member.moc && (
                    <div>
                      <p className="text-sm text-default-500">MOC</p>
                      <Chip size="sm" variant="flat">
                        {member.moc}
                      </Chip>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-default-500">Member Type</p>
                    <Chip size="sm" variant="flat" color={getMemberTypeColor(member.memberType)}>
                      {getMemberTypeLabel(member.memberType)}
                    </Chip>
                  </div>
                  {member.mess && (
                    <div>
                      <p className="text-sm text-default-500">Mess</p>
                      <Chip size="sm" variant="flat">
                        {member.mess}
                      </Chip>
                    </div>
                  )}
                  {(member.contractStart || member.contractEnd) && (
                    <div className="col-span-2">
                      <p className="text-sm text-default-500">Contract Period</p>
                      <div className="flex items-center gap-2">
                        <p className="text-base">
                          {formatDate(member.contractStart)} — {formatDate(member.contractEnd)}
                        </p>
                        {member.contractEnd && getContractWarning(member.contractEnd) && (
                          <Chip
                            size="sm"
                            color={getContractWarning(member.contractEnd) as 'warning' | 'danger'}
                          >
                            {getContractWarning(member.contractEnd) === 'danger'
                              ? 'Expired'
                              : 'Expiring Soon'}
                          </Chip>
                        )}
                      </div>
                    </div>
                  )}
                  {member.badgeId && (
                    <div>
                      <p className="text-sm text-default-500">Badge ID</p>
                      <p className="font-mono text-base">{member.badgeId}</p>
                    </div>
                  )}
                  {member.employeeNumber && (
                    <div>
                      <p className="text-sm text-default-500">Employee Number</p>
                      <p className="font-mono text-base">{member.employeeNumber}</p>
                    </div>
                  )}
                  {member.tags && member.tags.length > 0 && (
                    <div className="col-span-2">
                      <p className="mb-2 text-sm text-default-500">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {member.tags.map((tag) => (
                          <TagChip key={tag.id} tagName={tag.name} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Contact Information Card */}
            {(member.email || member.mobilePhone || member.homePhone) && (
              <Card>
                <CardBody>
                  <h3 className="mb-4 text-lg font-semibold">Contact Information</h3>
                  <div className="space-y-3">
                    {member.email && (
                      <div className="flex items-center gap-2">
                        <Icon icon="solar:letter-linear" width={20} className="text-default-400" />
                        <a
                          href={`mailto:${member.email}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {member.email}
                        </a>
                      </div>
                    )}
                    {member.mobilePhone && (
                      <div className="flex items-center gap-2">
                        <Icon icon="solar:smartphone-linear" width={20} className="text-default-400" />
                        <a
                          href={`tel:${member.mobilePhone}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {member.mobilePhone}
                        </a>
                      </div>
                    )}
                    {member.homePhone && (
                      <div className="flex items-center gap-2">
                        <Icon icon="solar:phone-linear" width={20} className="text-default-400" />
                        <a
                          href={`tel:${member.homePhone}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {member.homePhone}
                        </a>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                color="primary"
                className="flex-1"
                onPress={handleViewFullDetails}
                startContent={<Icon icon="solar:document-text-linear" width={18} />}
              >
                View Full Details
              </Button>
              <Button
                variant="flat"
                onPress={() => setIsEditModalOpen(true)}
                startContent={<Icon icon="solar:pen-linear" width={18} />}
              >
                Edit
              </Button>
              <Button
                variant="flat"
                color="danger"
                onPress={() => setIsDeleteModalOpen(true)}
                startContent={<Icon icon="solar:trash-bin-trash-linear" width={18} />}
              >
                Delete
              </Button>
            </div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Edit Member Modal - Stacks on top of drawer */}
      <MemberModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditSave}
        member={member}
        divisions={divisions}
        tags={tags}
      />

      {/* Delete Confirmation Modal - Stacks on top of drawer */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <ModalContent>
          <ModalHeader>Delete Member</ModalHeader>
          <ModalBody>
            <p>
              Are you sure you want to permanently delete{' '}
              <strong>
                {member.rank} {member.lastName}, {member.firstName}
              </strong>
              ? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button color="danger" onPress={handleDelete} isLoading={deleteMutation.isPending}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
