import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StaffCheckInCard } from './StaffCheckInCard';
import { EmptyState } from '../shared/EmptyState';
import { Skeleton } from '../shared/Skeleton';
import { Spacing } from '@/core/theme';

export type ListFilter = 'all' | 'checked-in' | 'not-checked-in';

interface StaffCheckInListProps {
  persons: any[];
  isLoading: boolean;
  filter: ListFilter;
  onCheckIn: (person: any) => void;
  onCheckOut: (person: any) => void;
  activeMemberIds: Set<number>;
}

export function StaffCheckInList({
  persons,
  isLoading,
  filter,
  onCheckIn,
  onCheckOut,
  activeMemberIds,
}: StaffCheckInListProps) {
  if (isLoading) {
    return (
      <View style={styles.list}>
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} height={70} style={{ marginBottom: Spacing.two }} />
        ))}
      </View>
    );
  }

  const getIsActive = (person: any) => {
    return activeMemberIds.has(person.id ?? person.memberDbId);
  };

  const filteredPersons = persons.filter((person) => {
    const active = getIsActive(person);
    if (filter === 'checked-in') return active;
    if (filter === 'not-checked-in') return !active;
    return true; // 'all'
  });

  if (filteredPersons.length === 0) {
    return <EmptyState title="No records found" description="Try a different search term or filter." />;
  }

  return (
    <View style={styles.list}>
      {filteredPersons.map(item => {
        const key = `member-${item.id || item.bizId}`;
        return (
          <StaffCheckInCard
            key={key}
            person={item}
            onCheckIn={onCheckIn}
            onCheckOut={onCheckOut}
            isActive={getIsActive(item)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.three,
  },
});
