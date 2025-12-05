import { useMemo } from 'react';
import PersonCard from './PersonCard';
import type { PresentPerson, DashboardFilters } from '../../../../shared/types';

interface PersonCardGridProps {
  people: PresentPerson[];
  filters: DashboardFilters;
  selectMode: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onPersonPress: (person: PresentPerson) => void;
}

export default function PersonCardGrid({
  people,
  filters,
  selectMode,
  selectedIds,
  onSelectionChange,
  onPersonPress,
}: PersonCardGridProps) {
  // Filter people based on type and search query
  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      // Type filter
      if (filters.typeFilter === 'members' && person.type !== 'member') return false;
      if (filters.typeFilter === 'visitors' && person.type !== 'visitor') return false;

      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const nameMatch = person.name.toLowerCase().includes(query);
        const divMatch = person.division?.toLowerCase().includes(query);
        const orgMatch = person.organization?.toLowerCase().includes(query);
        if (!nameMatch && !divMatch && !orgMatch) return false;
      }

      return true;
    });
  }, [people, filters]);

  // Sort: visitors first, then members, each by newest checkInTime
  const sortedPeople = useMemo(() => {
    return [...filteredPeople].sort((a, b) => {
      // Visitors first
      if (a.type !== b.type) {
        return a.type === 'visitor' ? -1 : 1;
      }
      // Within type, newest first
      return b.checkInTime.getTime() - a.checkInTime.getTime();
    });
  }, [filteredPeople]);

  const handleSelect = (id: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    onSelectionChange(newSelectedIds);
  };

  // Handle card press - in select mode, toggle selection; otherwise open modal
  const handleCardPress = (person: PresentPerson) => {
    if (selectMode) {
      handleSelect(person.id);
    } else {
      onPersonPress(person);
    }
  };

  if (sortedPeople.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-default-500">No one is currently present</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sortedPeople.map((person) => (
        <PersonCard
          key={person.id}
          person={person}
          selectMode={selectMode}
          isSelected={selectedIds.has(person.id)}
          onSelect={handleSelect}
          onPress={handleCardPress}
        />
      ))}
    </div>
  );
}
