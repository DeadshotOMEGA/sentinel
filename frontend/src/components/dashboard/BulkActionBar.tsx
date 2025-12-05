import { useState } from 'react';
import { Button, Chip, Divider } from '@heroui/react';
import { Icon } from '@iconify/react';
import type { PresentPerson } from '../../../../shared/types';

interface BulkActionBarProps {
  selectedPeople: PresentPerson[];
  onSelectAll: () => void;
  onSelectNone: () => void;
  onSelectAllMembers: () => void;
  onSelectAllVisitors: () => void;
  onBulkCheckout: () => Promise<void>;
  onExportCSV: () => void;
  totalCount: number;
  memberCount: number;
  visitorCount: number;
  isLoading?: boolean;
}

export default function BulkActionBar({
  selectedPeople,
  onSelectAll,
  onSelectNone,
  onSelectAllMembers,
  onSelectAllVisitors,
  onBulkCheckout,
  onExportCSV,
  totalCount,
  memberCount,
  visitorCount,
  isLoading = false
}: BulkActionBarProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleBulkCheckout = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsCheckingOut(true);
    try {
      await onBulkCheckout();
      setShowConfirm(false);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const selectedCount = selectedPeople.length;
  const allSelected = selectedCount === totalCount;

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 mb-4 bg-content1 rounded-lg border border-default-200 animate-slide-down"
      role="status"
      aria-live="polite"
      aria-label={`${selectedCount} ${selectedCount === 1 ? 'person' : 'people'} selected`}
    >
      {/* Selection Status */}
      <div className="flex items-center gap-2">
        <Icon icon="mdi:checkbox-marked" width={20} className="text-primary" />
        <Chip
          variant="flat"
          color="primary"
          className="font-semibold"
          aria-label={`${selectedCount} selected`}
        >
          {selectedCount} selected
        </Chip>
      </div>

      {/* Selection Controls */}
      <Button
        size="sm"
        variant="flat"
        color="primary"
        onClick={onSelectAll}
        disabled={isLoading || allSelected}
        startContent={<Icon icon="mdi:select-all" width={16} />}
        aria-label={`Select all ${totalCount} people`}
      >
        All ({totalCount})
      </Button>

      {memberCount > 0 && (
        <Button
          size="sm"
          variant="flat"
          color="success"
          onClick={onSelectAllMembers}
          disabled={isLoading}
          startContent={<Icon icon="mdi:account-group" width={16} />}
          aria-label={`Select all ${memberCount} members`}
        >
          Members ({memberCount})
        </Button>
      )}

      {visitorCount > 0 && (
        <Button
          size="sm"
          variant="flat"
          color="secondary"
          onClick={onSelectAllVisitors}
          disabled={isLoading}
          startContent={<Icon icon="mdi:account-clock" width={16} />}
          aria-label={`Select all ${visitorCount} visitors`}
        >
          Visitors ({visitorCount})
        </Button>
      )}

      <Button
        size="sm"
        variant="flat"
        color="default"
        onClick={onSelectNone}
        disabled={isLoading}
        startContent={<Icon icon="mdi:selection-off" width={16} />}
        aria-label="Clear selection"
      >
        None
      </Button>

      <Divider orientation="vertical" className="h-6" />

      {/* Bulk Actions */}
      <div className="flex items-center gap-2 ml-auto">
        {showConfirm && (
          <span className="text-sm text-danger font-medium mr-2">
            Confirm checkout for {selectedCount} {selectedCount === 1 ? 'person' : 'people'}?
          </span>
        )}

        <Button
          size="sm"
          variant="flat"
          color={showConfirm ? 'danger' : 'warning'}
          onClick={handleBulkCheckout}
          disabled={isLoading || isCheckingOut || selectedCount === 0}
          isLoading={isCheckingOut}
          startContent={!isCheckingOut && <Icon icon="mdi:logout" width={16} />}
          aria-label={showConfirm ? 'Confirm bulk checkout' : 'Check out all selected people'}
          onBlur={() => {
            // Reset confirm state when focus leaves the button
            if (showConfirm) {
              setTimeout(() => setShowConfirm(false), 200);
            }
          }}
        >
          {showConfirm ? 'Confirm Check Out' : 'Check Out All'}
        </Button>

        {showConfirm && (
          <Button
            size="sm"
            variant="light"
            color="default"
            onClick={() => setShowConfirm(false)}
            disabled={isCheckingOut}
            aria-label="Cancel bulk checkout"
          >
            Cancel
          </Button>
        )}

        {!showConfirm && (
          <Button
            size="sm"
            variant="flat"
            color="success"
            onClick={onExportCSV}
            disabled={isLoading || selectedCount === 0}
            startContent={<Icon icon="mdi:file-export" width={16} />}
            aria-label="Export selected people to CSV"
          >
            Export CSV
          </Button>
        )}
      </div>
    </div>
  );
}
