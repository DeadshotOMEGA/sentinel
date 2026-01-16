import { useState, useEffect } from 'react';
import { Chip, Input, Switch, Divider, Tooltip, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import type { DashboardFilters } from '../../../../shared/types';

interface FilterBarProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  selectMode: boolean;
  onSelectModeChange: (enabled: boolean) => void;
  selectedCount: number;
  onOpenMemberCheckin: () => void;
  onOpenVisitorCheckin: () => void;
  memberCount: number;
  visitorCount: number;
}

export default function FilterBar({
  filters,
  onFiltersChange,
  selectMode,
  onSelectModeChange,
  selectedCount,
  memberCount, 
  visitorCount,
  onOpenMemberCheckin,
  onOpenVisitorCheckin,
}: FilterBarProps) {
  const [searchValue, setSearchValue] = useState(filters.searchQuery);
  const navigate = useNavigate();
  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({ ...filters, searchQuery: searchValue });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTypeFilterChange = (typeFilter: 'all' | 'members' | 'visitors') => {
    onFiltersChange({ ...filters, typeFilter });
  };

  return (
    <div className="flex items-center gap-4 pb-4 border-b border-divider">
      {/* Type Filter */}
      <div className="flex gap-2">
        <Tooltip content="Show all checked-in people">
          <Chip
            variant={filters.typeFilter === 'all' ? 'solid' : 'bordered'}
            color={filters.typeFilter === 'all' ? 'primary' : 'default'}
            className="cursor-pointer"
            onClick={() => handleTypeFilterChange('all')}
            role="button"
            aria-pressed={filters.typeFilter === 'all'}
            aria-label="Filter by all"
          >
            All
          </Chip>
        </Tooltip>
        <Tooltip content="Show only unit members">
          <Chip
            variant={filters.typeFilter === 'members' ? 'solid' : 'bordered'}
            color={filters.typeFilter === 'members' ? 'primary' : 'default'}
            className="cursor-pointer"
            onClick={() => handleTypeFilterChange('members')}
            role="button"
            aria-pressed={filters.typeFilter === 'members'}
            aria-label="Filter by members"
          >
            Members
          </Chip>
        </Tooltip>
        <Tooltip content="Show only visitors">
          <Chip
            variant={filters.typeFilter === 'visitors' ? 'solid' : 'bordered'}
            color={filters.typeFilter === 'visitors' ? 'primary' : 'default'}
            className="cursor-pointer"
            onClick={() => handleTypeFilterChange('visitors')}
            role="button"
            aria-pressed={filters.typeFilter === 'visitors'}
            aria-label="Filter by visitors"
          >
            Visitors
          </Chip>
        </Tooltip>
      </div>

      <Divider orientation="vertical" className="h-6" />

      {/* Check-in Dropdown */}
      <Dropdown>
        <Tooltip content="Manually check in a member or visitor">
          <div className="inline-flex">
            <DropdownTrigger>
              <Button
                color="primary"
                size="sm"
                variant="shadow"
                startContent={<Icon icon="solar:add-circle-linear" width={20} />}
                aria-label="Check in person"
              >
                Check In
              </Button>
            </DropdownTrigger>
          </div>
        </Tooltip>
        <DropdownMenu aria-label="Check-in options">
          <DropdownItem
            key="member"
            description="Search and check in a unit member"
            startContent={<Icon icon="solar:user-check-linear" width={20} />}
            onPress={onOpenMemberCheckin}
          >
            Check In Member
          </DropdownItem>
          <DropdownItem
            key="visitor"
            description="Register and check in a visitor"
            startContent={<Icon icon="solar:users-group-rounded-linear" width={20} />}
            onPress={onOpenVisitorCheckin}
          >
            Check In Visitor
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>

      <Divider orientation="vertical" className="h-6" />

      {/* Search Input */}
      <Input
        variant="underlined"
        placeholder="Search by name, rank, division..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        startContent={<Icon icon="solar:magnifer-linear" width={16} className="text-default-400" />}
        isClearable
        onClear={() => setSearchValue('')}
        className="w-64"
        aria-label="Search present people"
      />

      <Divider orientation="vertical" className="h-6" />

      {/* Select Mode Toggle */}
      <Tooltip content="Enable multi-select to check out or export multiple people at once">
        <div className="flex items-center gap-2">
          <Switch
            size="sm"
            isSelected={selectMode}
            onValueChange={onSelectModeChange}
            aria-label="Toggle selection mode"
          />
          <span className="text-sm text-default-600">
            Select {selectedCount > 0 && `(${selectedCount})`}
          </span>
        </div>
      </Tooltip>

      <Divider orientation="vertical" className="h-6" />


        <Tooltip content="Click to view all members">
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
        </Tooltip>
        <Tooltip content="Click to view all visitors">
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
        </Tooltip>
    </div>
  );
}
