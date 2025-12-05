import { useState, useEffect } from 'react';
import { Chip, Input, Switch, Divider, Tooltip, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
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
}

export default function FilterBar({
  filters,
  onFiltersChange,
  selectMode,
  onSelectModeChange,
  selectedCount,
  onOpenMemberCheckin,
  onOpenVisitorCheckin,
}: FilterBarProps) {
  const [searchValue, setSearchValue] = useState(filters.searchQuery);

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
        {(['all', 'members', 'visitors'] as const).map((type) => (
          <Chip
            key={type}
            variant={filters.typeFilter === type ? 'solid' : 'bordered'}
            color={filters.typeFilter === type ? 'primary' : 'default'}
            className="cursor-pointer"
            onClick={() => handleTypeFilterChange(type)}
            role="button"
            aria-pressed={filters.typeFilter === type}
            aria-label={`Filter by ${type}`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Chip>
        ))}
      </div>

      <Divider orientation="vertical" className="h-6" />

      {/* Check-in Dropdown */}
      <Dropdown>
        <DropdownTrigger>
          <Button
            color="primary"
            variant="flat"
            startContent={<Icon icon="solar:add-circle-linear" width={20} />}
            aria-label="Check in person"
          >
            Check In
          </Button>
        </DropdownTrigger>
        <DropdownMenu aria-label="Check-in options">
          <DropdownItem
            key="member"
            startContent={<Icon icon="solar:user-check-linear" width={20} />}
            onPress={onOpenMemberCheckin}
          >
            Check In Member
          </DropdownItem>
          <DropdownItem
            key="visitor"
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
    </div>
  );
}
