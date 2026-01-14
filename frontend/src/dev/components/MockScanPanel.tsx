import { useState, useEffect, useMemo } from 'react';
import {
  Button,
  Input,
  Listbox,
  ListboxItem,
  Chip,
  Spinner,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { api } from '../../lib/api';

// ============================================================================
// Types
// ============================================================================

interface MemberWithBadge {
  id: string;
  firstName: string;
  lastName: string;
  rank: string;
  division: string;
  divisionId: string;
  mess: string | null;
  badgeSerialNumber: string | null;
  isPresent: boolean;
}

interface MembersResponse {
  members: MemberWithBadge[];
}

interface MockScanResponse {
  success: boolean;
  direction: 'in' | 'out';
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    rank: string;
    division: string;
  };
  error?: string;
}

interface ScanResult {
  success: boolean;
  memberName: string;
  direction: 'in' | 'out';
  timestamp: Date;
  error?: string;
}

// ============================================================================
// MockScanPanel Component
// ============================================================================

export function MockScanPanel() {
  const [members, setMembers] = useState<MemberWithBadge[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberWithBadge | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [flashState, setFlashState] = useState<'success' | 'error' | null>(null);

  // Fetch members on mount
  useEffect(() => {
    async function fetchMembers() {
      setIsLoadingMembers(true);
      setMembersError(null);
      try {
        const response = await api.get<MembersResponse>('/dev-tools/members');
        setMembers(response.data.members);
      } catch (err) {
        const error = err as { response?: { data?: { error?: string } }; message?: string };
        const errorMessage = error.response?.data?.error ?? error.message ?? 'Failed to fetch members';
        setMembersError(errorMessage);
      } finally {
        setIsLoadingMembers(false);
      }
    }

    fetchMembers();
  }, []);

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) {
      return members;
    }
    const query = searchQuery.toLowerCase();
    return members.filter(
      (member) =>
        member.firstName.toLowerCase().includes(query) ||
        member.lastName.toLowerCase().includes(query) ||
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(query) ||
        `${member.lastName} ${member.firstName}`.toLowerCase().includes(query) ||
        member.rank.toLowerCase().includes(query) ||
        member.badgeSerialNumber?.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  // Members with valid badges only
  const membersWithBadges = useMemo(() => {
    return filteredMembers.filter((m) => m.badgeSerialNumber);
  }, [filteredMembers]);

  // Execute a scan
  const executeScan = async (serialNumber: string, memberName: string) => {
    setIsScanning(true);
    setFlashState(null);

    try {
      const response = await api.post<MockScanResponse>('/dev-tools/mock-scan', {
        serialNumber,
      });

      const result: ScanResult = {
        success: response.data.success,
        memberName: response.data.member
          ? `${response.data.member.rank} ${response.data.member.firstName} ${response.data.member.lastName}`
          : memberName,
        direction: response.data.direction,
        timestamp: new Date(),
        error: response.data.error,
      };

      setLastResult(result);
      setFlashState(result.success ? 'success' : 'error');
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = error.response?.data?.error ?? error.message ?? 'Scan failed';

      setLastResult({
        success: false,
        memberName,
        direction: 'in',
        timestamp: new Date(),
        error: errorMessage,
      });
      setFlashState('error');
    } finally {
      setIsScanning(false);
      // Clear flash after a short delay
      setTimeout(() => setFlashState(null), 1500);
    }
  };

  // Handle scanning selected member
  const handleScanSelected = async () => {
    if (!selectedMember?.badgeSerialNumber) {
      setLastResult({
        success: false,
        memberName: selectedMember
          ? `${selectedMember.rank} ${selectedMember.firstName} ${selectedMember.lastName}`
          : 'Unknown',
        direction: 'in',
        timestamp: new Date(),
        error: 'Selected member has no badge assigned',
      });
      setFlashState('error');
      setTimeout(() => setFlashState(null), 1500);
      return;
    }

    await executeScan(
      selectedMember.badgeSerialNumber,
      `${selectedMember.rank} ${selectedMember.firstName} ${selectedMember.lastName}`
    );
  };

  // Handle scanning random member
  const handleScanRandom = async () => {
    if (membersWithBadges.length === 0) {
      setLastResult({
        success: false,
        memberName: 'Unknown',
        direction: 'in',
        timestamp: new Date(),
        error: 'No members with badges available',
      });
      setFlashState('error');
      setTimeout(() => setFlashState(null), 1500);
      return;
    }

    const randomMember = membersWithBadges[Math.floor(Math.random() * membersWithBadges.length)];
    await executeScan(
      randomMember.badgeSerialNumber!,
      `${randomMember.rank} ${randomMember.firstName} ${randomMember.lastName}`
    );
  };

  // Handle bulk scan
  const handleBulkScan = async (count: number) => {
    if (membersWithBadges.length === 0) {
      setLastResult({
        success: false,
        memberName: 'Unknown',
        direction: 'in',
        timestamp: new Date(),
        error: 'No members with badges available',
      });
      setFlashState('error');
      setTimeout(() => setFlashState(null), 1500);
      return;
    }

    setIsScanning(true);
    setFlashState(null);

    // Get random unique members (up to count or available members)
    const shuffled = [...membersWithBadges].sort(() => 0.5 - Math.random());
    const toScan = shuffled.slice(0, Math.min(count, shuffled.length));

    let successCount = 0;
    let lastDirection: 'in' | 'out' = 'in';
    let lastError: string | undefined;

    for (const member of toScan) {
      try {
        const response = await api.post<MockScanResponse>('/dev-tools/mock-scan', {
          serialNumber: member.badgeSerialNumber,
        });

        if (response.data.success) {
          successCount++;
          lastDirection = response.data.direction;
        } else {
          lastError = response.data.error;
        }
      } catch (err) {
        const error = err as { response?: { data?: { error?: string } }; message?: string };
        lastError = error.response?.data?.error ?? error.message ?? 'Scan failed';
      }

      // Small delay between scans to not overwhelm the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const result: ScanResult = {
      success: successCount > 0,
      memberName: successCount === toScan.length
        ? `${successCount} members scanned`
        : `${successCount}/${toScan.length} scans succeeded`,
      direction: lastDirection,
      timestamp: new Date(),
      error: successCount < toScan.length ? lastError : undefined,
    };

    setLastResult(result);
    setFlashState(successCount === toScan.length ? 'success' : successCount > 0 ? 'success' : 'error');
    setIsScanning(false);
    setTimeout(() => setFlashState(null), 1500);
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Loading state
  if (isLoadingMembers) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="md" />
      </div>
    );
  }

  // Error state
  if (membersError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-danger">
        <Icon icon="solar:danger-triangle-bold" width={32} className="mb-2" />
        <p className="text-sm">{membersError}</p>
        <Button
          size="sm"
          variant="flat"
          color="danger"
          className="mt-2"
          onPress={() => {
            setMembersError(null);
            setIsLoadingMembers(true);
            api
              .get<MembersResponse>('/dev-tools/members')
              .then((res) => setMembers(res.data.members))
              .catch((e) => {
                const err = e as { response?: { data?: { error?: string } }; message?: string };
                setMembersError(err.response?.data?.error ?? err.message ?? 'Failed to fetch');
              })
              .finally(() => setIsLoadingMembers(false));
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Flash feedback overlay */}
      {flashState && (
        <div
          className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${
            flashState === 'success' ? 'bg-success/10' : 'bg-danger/10'
          }`}
        />
      )}

      {/* Last scan result */}
      {lastResult && (
        <div
          className={`rounded-lg border p-3 transition-colors ${
            lastResult.success
              ? 'border-success-200 bg-success-50'
              : 'border-danger-200 bg-danger-50'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon
                icon={lastResult.success ? 'solar:check-circle-bold' : 'solar:close-circle-bold'}
                width={18}
                className={lastResult.success ? 'text-success-600' : 'text-danger-600'}
              />
              <span
                className={`text-sm font-medium ${
                  lastResult.success ? 'text-success-700' : 'text-danger-700'
                }`}
              >
                {lastResult.memberName}
              </span>
            </div>
            <Chip
              size="sm"
              variant="flat"
              color={lastResult.direction === 'in' ? 'success' : 'warning'}
            >
              {lastResult.direction.toUpperCase()}
            </Chip>
          </div>
          {lastResult.error && (
            <p className="mt-1 text-xs text-danger-600">{lastResult.error}</p>
          )}
          <p className="mt-1 text-xs text-default-400">{formatTime(lastResult.timestamp)}</p>
        </div>
      )}

      {/* Member selector */}
      <div className="space-y-2">
        <Input
          size="sm"
          placeholder="Search by name, rank, or badge..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<Icon icon="solar:magnifer-linear" width={16} className="text-default-400" />}
          isClearable
          onClear={() => setSearchQuery('')}
          classNames={{
            inputWrapper: 'bg-default-800 border-default-600',
            input: 'text-default-100 placeholder:text-default-500',
          }}
        />

        {/* Selected member display */}
        {selectedMember && (
          <div className="rounded-lg border border-primary-500/50 bg-primary-500/10 p-2">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary-300 truncate">
                  {selectedMember.rank} {selectedMember.firstName} {selectedMember.lastName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {selectedMember.badgeSerialNumber ? (
                    <p className="text-xs text-primary-400 font-mono">
                      {selectedMember.badgeSerialNumber}
                    </p>
                  ) : (
                    <p className="text-xs text-warning-400">No badge</p>
                  )}
                  <Chip
                    size="sm"
                    variant="flat"
                    color={selectedMember.isPresent ? 'success' : 'default'}
                    className="h-4 text-[10px]"
                  >
                    {selectedMember.isPresent ? 'IN' : 'OUT'}
                  </Chip>
                </div>
              </div>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                className="text-default-400 hover:text-default-100"
                onPress={() => setSelectedMember(null)}
                aria-label="Clear selection"
              >
                <Icon icon="solar:close-circle-linear" width={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Member list */}
        {!selectedMember && (
          <div className="max-h-32 overflow-y-auto rounded-lg border border-default-700 bg-default-800/50">
            <Listbox
              aria-label="Member list"
              emptyContent={
                <div className="py-3 text-center text-xs text-default-500">
                  {filteredMembers.length === 0 && searchQuery
                    ? 'No members match your search'
                    : 'No members available'}
                </div>
              }
              classNames={{
                list: 'gap-0',
              }}
            >
              {filteredMembers.slice(0, 50).map((member) => (
                <ListboxItem
                  key={member.id}
                  textValue={`${member.rank} ${member.firstName} ${member.lastName}`}
                  onClick={() => setSelectedMember(member)}
                  classNames={{
                    base: 'py-1.5 px-2 data-[hover=true]:bg-default-700/50',
                    title: 'text-default-200',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {member.rank} {member.firstName} {member.lastName}
                      </p>
                      <p className="text-[10px] text-default-500 truncate">
                        {member.division}
                        {member.badgeSerialNumber && (
                          <span className="font-mono ml-1 text-default-400">
                            ({member.badgeSerialNumber})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!member.badgeSerialNumber && (
                        <Icon icon="solar:card-linear" width={12} className="text-warning-400" />
                      )}
                      <div
                        className={`w-2 h-2 rounded-full ${
                          member.isPresent ? 'bg-success-500' : 'bg-default-500'
                        }`}
                      />
                    </div>
                  </div>
                </ListboxItem>
              ))}
            </Listbox>
            {filteredMembers.length > 50 && (
              <p className="py-1 text-center text-[10px] text-default-500 border-t border-default-700">
                Showing 50 of {filteredMembers.length} - refine your search
              </p>
            )}
          </div>
        )}
      </div>

      {/* Scan buttons */}
      <div className="space-y-2">
        <Button
          fullWidth
          size="sm"
          color="primary"
          variant="solid"
          isLoading={isScanning}
          isDisabled={!selectedMember || !selectedMember.badgeSerialNumber}
          onPress={handleScanSelected}
          startContent={!isScanning && <Icon icon="solar:nfc-bold" width={16} />}
        >
          Simulate Scan
        </Button>

        <div className="grid grid-cols-3 gap-2">
          <Button
            size="sm"
            variant="flat"
            color="secondary"
            isLoading={isScanning}
            isDisabled={membersWithBadges.length === 0}
            onPress={handleScanRandom}
            className="text-xs"
          >
            Random
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="secondary"
            isLoading={isScanning}
            isDisabled={membersWithBadges.length === 0}
            onPress={() => handleBulkScan(5)}
            className="text-xs"
          >
            Bulk (5)
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="secondary"
            isLoading={isScanning}
            isDisabled={membersWithBadges.length === 0}
            onPress={() => handleBulkScan(10)}
            className="text-xs"
          >
            Bulk (10)
          </Button>
        </div>
      </div>

      {/* Stats footer */}
      <div className="flex items-center justify-between text-[10px] text-default-500 pt-1 border-t border-default-700">
        <span>{members.length} members loaded</span>
        <span>{membersWithBadges.length} with badges</span>
      </div>
    </div>
  );
}
