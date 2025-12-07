import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
  Select,
  SelectItem,
  Switch,
  Divider,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import type { Division, Tag } from '@shared/types';
import type { MemberFilters } from '../../hooks/useMemberFilters';

interface MembersFilterPopoverProps {
  filters: MemberFilters;
  divisions: Division[];
  tags: Tag[];
  onMessChange: (values: string[]) => void;
  onMocChange: (values: string[]) => void;
  onDivisionChange: (values: string[]) => void;
  onContractChange: (values: string[]) => void;
  onTagsChange: (values: string[]) => void;
  onExcludeTagsChange: (values: string[]) => void;
  onClearFilters: () => void;
}

const MESS_OPTIONS = [
  { key: 'Junior Ranks', label: 'Junior Ranks' },
  { key: 'Wardroom', label: 'Wardroom' },
  { key: 'C&POs', label: 'C&POs' },
];

const MOC_OPTIONS = [
  { key: 'MARS', label: 'MARS' },
  { key: 'LOG', label: 'LOG' },
  { key: 'NWO', label: 'NWO' },
  { key: 'BOSN', label: 'BOSN' },
  { key: 'NAVCOM', label: 'NAVCOM' },
  { key: 'NCIOP', label: 'NCIOP' },
  { key: 'NESOP', label: 'NESOP' },
  { key: 'SONAR', label: 'SONAR' },
];

const CONTRACT_OPTIONS = [
  { key: 'active', label: 'Active' },
  { key: 'expiring_soon', label: 'Expiring Soon (30 days)' },
  { key: 'expired', label: 'Expired' },
];

export default function MembersFilterPopover({
  filters,
  divisions,
  tags,
  onMessChange,
  onMocChange,
  onDivisionChange,
  onContractChange,
  onTagsChange,
  onExcludeTagsChange,
  onClearFilters,
}: MembersFilterPopoverProps) {
  const hasActiveFilters =
    filters.mess.length > 0 ||
    filters.moc.length > 0 ||
    filters.division.length > 0 ||
    filters.contract.length > 0 ||
    filters.tags.length > 0 ||
    filters.excludeTags.length > 0;

  const activeFilterCount =
    filters.mess.length +
    filters.moc.length +
    filters.division.length +
    filters.contract.length +
    filters.tags.length +
    filters.excludeTags.length;

  return (
    <Popover placement="bottom-start">
      <PopoverTrigger>
        <Button
          className="bg-default-100 text-default-800"
          size="sm"
          startContent={
            <Icon className="text-default-400" icon="solar:filter-linear" width={16} />
          }
          endContent={
            hasActiveFilters ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
                {activeFilterCount}
              </span>
            ) : undefined
          }
        >
          Filters
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-small font-semibold">Filter Members</h4>
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="light"
                color="danger"
                onPress={onClearFilters}
                startContent={<Icon icon="solar:close-circle-linear" width={16} />}
              >
                Clear All
              </Button>
            )}
          </div>

          <Divider />

          {/* Mess Filter */}
          <Select
            label="Mess"
            placeholder="Select mess"
            selectionMode="multiple"
            selectedKeys={new Set(filters.mess)}
            onSelectionChange={(keys) => {
              onMessChange(Array.from(keys) as string[]);
            }}
            size="sm"
          >
            {MESS_OPTIONS.map((option) => (
              <SelectItem key={option.key}>{option.label}</SelectItem>
            ))}
          </Select>

          {/* MOC Filter */}
          <Select
            label="MOC"
            placeholder="Select MOC"
            selectionMode="multiple"
            selectedKeys={new Set(filters.moc)}
            onSelectionChange={(keys) => {
              onMocChange(Array.from(keys) as string[]);
            }}
            size="sm"
          >
            {MOC_OPTIONS.map((option) => (
              <SelectItem key={option.key}>{option.label}</SelectItem>
            ))}
          </Select>

          {/* Division Filter */}
          <Select
            label="Division"
            placeholder="Select division"
            selectionMode="multiple"
            selectedKeys={new Set(filters.division)}
            onSelectionChange={(keys) => {
              onDivisionChange(Array.from(keys) as string[]);
            }}
            size="sm"
          >
            {divisions.map((division) => (
              <SelectItem key={division.id}>{division.name}</SelectItem>
            ))}
          </Select>

          {/* Contract Status Filter */}
          <Select
            label="Contract Status"
            placeholder="Select contract status"
            selectionMode="multiple"
            selectedKeys={new Set(filters.contract)}
            onSelectionChange={(keys) => {
              onContractChange(Array.from(keys) as string[]);
            }}
            size="sm"
          >
            {CONTRACT_OPTIONS.map((option) => (
              <SelectItem key={option.key}>{option.label}</SelectItem>
            ))}
          </Select>

          <Divider />

          {/* Tags Filter with Include/Exclude Toggle */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-small font-medium">Tags</label>
              <Switch
                size="sm"
                isSelected={filters.excludeTags.length > 0 && filters.tags.length === 0}
                onValueChange={(isExclude) => {
                  if (isExclude) {
                    // Switch to exclude mode - move tags to excludeTags
                    onExcludeTagsChange([...filters.tags]);
                    onTagsChange([]);
                  } else {
                    // Switch to include mode - move excludeTags to tags
                    onTagsChange([...filters.excludeTags]);
                    onExcludeTagsChange([]);
                  }
                }}
              >
                <span className="text-xs">
                  {filters.excludeTags.length > 0 && filters.tags.length === 0
                    ? 'Exclude'
                    : 'Include'}
                </span>
              </Switch>
            </div>

            <Select
              placeholder="Select tags"
              selectionMode="multiple"
              selectedKeys={
                new Set(
                  filters.excludeTags.length > 0 && filters.tags.length === 0
                    ? filters.excludeTags
                    : filters.tags
                )
              }
              onSelectionChange={(keys) => {
                const values = Array.from(keys) as string[];
                if (filters.excludeTags.length > 0 && filters.tags.length === 0) {
                  onExcludeTagsChange(values);
                } else {
                  onTagsChange(values);
                }
              }}
              size="sm"
              aria-label="Tag filter"
            >
              {tags.map((tag) => (
                <SelectItem key={tag.id} description={tag.description}>
                  {tag.name}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
