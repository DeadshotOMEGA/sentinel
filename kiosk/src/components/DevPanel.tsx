import { useState, useCallback, useEffect } from 'react';
import { getDevMembers, clearAllCheckins, type DevMember } from '../lib/api';
import MemberPickerModal from './MemberPickerModal';
import { Wrench, Dice5, Trash, User, X } from '@shared/ui/icons';
import { Button } from '@heroui/react';

interface DevPanelProps {
  onSimulateScan: (serialNumber: string) => void;
}

const TAPS_TO_REVEAL = 5;
const TAP_TIMEOUT_MS = 2000;

export default function DevPanel({ onSimulateScan }: DevPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [members, setMembers] = useState<DevMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Reset tap count after timeout
  useEffect(() => {
    if (tapCount > 0 && tapCount < TAPS_TO_REVEAL) {
      const timeout = setTimeout(() => setTapCount(0), TAP_TIMEOUT_MS);
      return () => clearTimeout(timeout);
    }
  }, [tapCount]);

  // Clear message after delay
  useEffect(() => {
    if (message) {
      const timeout = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [message]);

  const handleCornerTap = useCallback(() => {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    if (newCount >= TAPS_TO_REVEAL) {
      setIsVisible(true);
      setTapCount(0);
      // Load members when panel opens
      loadMembers();
    }
  }, [tapCount]);

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const data = await getDevMembers();
      setMembers(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setMessage(`Failed to load members: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRandomCheckIn = useCallback(() => {
    // Get members who are not present and have a badge
    const available = members.filter((m) => !m.isPresent && m.badgeSerialNumber);
    if (available.length === 0) {
      setMessage('No members available to check in');
      return;
    }
    const random = available[Math.floor(Math.random() * available.length)];
    setMessage(`Checking in ${random.rank} ${random.lastName}...`);
    onSimulateScan(random.badgeSerialNumber!);
    setIsVisible(false);
  }, [members, onSimulateScan]);

  const handleRandomCheckOut = useCallback(() => {
    // Get members who are present
    const present = members.filter((m) => m.isPresent && m.badgeSerialNumber);
    if (present.length === 0) {
      setMessage('No members to check out');
      return;
    }
    const random = present[Math.floor(Math.random() * present.length)];
    setMessage(`Checking out ${random.rank} ${random.lastName}...`);
    onSimulateScan(random.badgeSerialNumber!);
    setIsVisible(false);
  }, [members, onSimulateScan]);

  const handleClearAll = useCallback(async () => {
    setShowConfirmClear(false);
    setIsLoading(true);
    try {
      const result = await clearAllCheckins();
      setMessage(result.message);
      // Reload members to update presence status
      await loadMembers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setMessage(`Failed to clear check-ins: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleMemberSelect = useCallback(
    (member: DevMember) => {
      if (!member.badgeSerialNumber) {
        setMessage(`${member.rank} ${member.lastName} has no badge assigned`);
        return;
      }
      const action = member.isPresent ? 'Checking out' : 'Checking in';
      setMessage(`${action} ${member.rank} ${member.lastName}...`);
      onSimulateScan(member.badgeSerialNumber);
      setShowMemberPicker(false);
      setIsVisible(false);
    },
    [onSimulateScan]
  );

  const handleClose = () => {
    setIsVisible(false);
    setShowConfirmClear(false);
    setShowMemberPicker(false);
  };

  return (
    <>
      {/* Corner tap target (invisible) */}
      <button
        className="fixed top-0 left-0 w-16 h-16 z-50 opacity-0"
        onClick={handleCornerTap}
        aria-label="DEV panel activation"
      />

      {/* Tap indicator */}
      {tapCount > 0 && tapCount < TAPS_TO_REVEAL && (
        <div className="fixed top-2 left-2 bg-gray-800 text-white text-xs px-2 py-1 rounded z-50">
          {tapCount}/{TAPS_TO_REVEAL}
        </div>
      )}

      {/* Status message */}
      {message && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {message}
        </div>
      )}

      {/* DEV Panel */}
      {isVisible && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="dev-panel-title">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 id="dev-panel-title" className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Wrench className="h-6 w-6 text-orange-500" aria-hidden="true" />
                DEV Panel
              </h2>
              <Button
                size="lg"
                isIconOnly
                onPress={handleClose}
                className="min-h-[56px] min-w-[56px] text-gray-500 hover:text-gray-700"
                variant="light"
                aria-label="Close DEV panel"
              >
                <X className="h-8 w-8" aria-hidden="true" />
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  size="lg"
                  onPress={handleRandomCheckIn}
                  className="w-full min-h-[56px] px-6 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-colors"
                  aria-label="Simulate random member check-in"
                >
                  <Dice5 className="h-6 w-6" aria-hidden="true" />
                  Random Check-In
                </Button>

                <Button
                  size="lg"
                  onPress={handleRandomCheckOut}
                  className="w-full min-h-[56px] px-6 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-colors"
                  aria-label="Simulate random member check-out"
                >
                  <Dice5 className="h-6 w-6" aria-hidden="true" />
                  Random Check-Out
                </Button>

                <Button
                  size="lg"
                  onPress={() => setShowConfirmClear(true)}
                  className="w-full min-h-[56px] px-6 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-colors"
                  aria-label="Clear all member check-ins"
                >
                  <Trash className="h-6 w-6" aria-hidden="true" />
                  Clear All Check-Ins
                </Button>

                <Button
                  size="lg"
                  onPress={() => setShowMemberPicker(true)}
                  className="w-full min-h-[56px] px-6 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-colors"
                  aria-label="Pick specific member to check in or out"
                >
                  <User className="h-6 w-6" aria-hidden="true" />
                  Pick Specific Person
                </Button>

                <div className="text-center text-sm text-gray-500 mt-4">
                  {members.filter((m) => m.isPresent).length} present /{' '}
                  {members.filter((m) => m.badgeSerialNumber).length} with badges /{' '}
                  {members.length} total
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Clear Dialog */}
      {showConfirmClear && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="confirm-clear-title">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 id="confirm-clear-title" className="text-xl font-bold text-gray-900 mb-4">Clear All Check-Ins?</h3>
            <p className="text-gray-600 mb-6">
              This will check out all {members.filter((m) => m.isPresent).length} currently
              present members.
            </p>
            <div className="flex gap-3">
              <Button
                size="lg"
                onPress={() => setShowConfirmClear(false)}
                className="flex-1 min-h-[56px] px-4 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800 rounded-xl font-semibold transition-colors"
                aria-label="Cancel clearing check-ins"
              >
                Cancel
              </Button>
              <Button
                size="lg"
                onPress={handleClearAll}
                className="flex-1 min-h-[56px] px-4 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-xl font-semibold transition-colors"
                aria-label="Confirm clear all check-ins"
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Member Picker Modal */}
      {showMemberPicker && (
        <MemberPickerModal
          members={members}
          onSelect={handleMemberSelect}
          onClose={() => setShowMemberPicker(false)}
        />
      )}
    </>
  );
}
