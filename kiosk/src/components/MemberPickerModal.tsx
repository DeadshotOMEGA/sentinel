import { useMemo } from 'react';
import type { DevMember } from '../lib/api';
import { X } from '@shared/ui/icons';

interface MemberPickerModalProps {
  members: DevMember[];
  onSelect: (member: DevMember) => void;
  onClose: () => void;
}

export default function MemberPickerModal({ members, onSelect, onClose }: MemberPickerModalProps) {
  // Group members by division, sorted alphabetically within each group
  const groupedMembers = useMemo(() => {
    const groups = new Map<string, DevMember[]>();

    for (const member of members) {
      if (!member.division) {
        throw new Error(`Member ${member.id} has no division assigned`);
      }
      if (!groups.has(member.division)) {
        groups.set(member.division, []);
      }
      groups.get(member.division)!.push(member);
    }

    // Sort members within each group
    for (const memberList of groups.values()) {
      memberList.sort((a, b) => {
        const lastNameCompare = a.lastName.localeCompare(b.lastName);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.firstName.localeCompare(b.firstName);
      });
    }

    // Sort divisions alphabetically, but put Command first
    const sortedEntries = Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === 'Command') return -1;
      if (b === 'Command') return 1;
      return a.localeCompare(b);
    });

    return sortedEntries;
  }, [members]);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Select Member</h2>
          <button
            onClick={onClose}
            className="min-h-[56px] min-w-[56px] flex items-center justify-center text-gray-500 hover:text-gray-700 rounded-lg active:bg-gray-100"
            aria-label="Close member picker"
          >
            <X className="h-8 w-8" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {groupedMembers.map(([division, divisionMembers]) => (
            <div key={division} className="mb-6 last:mb-0">
              <h3 className="text-lg font-semibold text-gray-700 mb-2 px-2 sticky top-0 bg-white py-1">
                {division}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({divisionMembers.filter((m) => m.isPresent).length}/{divisionMembers.length})
                </span>
              </h3>
              <div className="space-y-2">
                {divisionMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => onSelect(member)}
                    disabled={!member.badgeSerialNumber}
                    className={`w-full text-left px-4 py-4 min-h-[56px] rounded-xl flex items-center justify-between transition-colors ${
                      !member.badgeSerialNumber
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : member.isPresent
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          member.isPresent ? 'bg-emerald-500' : 'bg-gray-300'
                        }`}
                      />
                      <div>
                        <span className="font-medium">
                          {member.rank} {member.lastName}, {member.firstName}
                        </span>
                        {member.mess && (
                          <span className="text-sm text-gray-500 ml-2">({member.mess})</span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm">
                      {!member.badgeSerialNumber ? (
                        <span className="text-gray-400">No badge</span>
                      ) : member.isPresent ? (
                        <span className="text-emerald-600">Check Out →</span>
                      ) : (
                        <span className="text-blue-600">Check In →</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
