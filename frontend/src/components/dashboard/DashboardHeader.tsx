import { Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

interface DashboardHeaderProps {
  title: string;
  memberCount: number;
  visitorCount: number;
}

export default function DashboardHeader({ title, memberCount, visitorCount }: DashboardHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="flex gap-3">
        <Chip
          variant="bordered"
          className="bg-content1 cursor-pointer"
          onClick={() => navigate('/members')}
          startContent={<Icon icon="solar:users-group-rounded-bold" className="text-success-600" width={16} />}
          role="button"
          aria-label={`View ${memberCount} members`}
        >
          {memberCount} Members
        </Chip>
        <Chip
          variant="bordered"
          className="bg-content1 cursor-pointer"
          onClick={() => navigate('/visitors')}
          startContent={<Icon icon="solar:user-check-bold" className="text-primary-600" width={16} />}
          role="button"
          aria-label={`View ${visitorCount} visitors`}
        >
          {visitorCount} Visitors
        </Chip>
      </div>
    </div>
  );
}
