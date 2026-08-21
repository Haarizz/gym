import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { AppBottomSheet, Button } from '@/shared/components';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { TrainerSessionItem } from '../../domain/TrainerScheduleData';

export interface SessionDetailsSheetProps {
  visible: boolean;
  session: TrainerSessionItem | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SessionDetailsSheet({ visible, session, onClose, onEdit, onDelete }: SessionDetailsSheetProps) {
  if (!session) return null;

  // The actual UI should match the existing style language. The prompt gives an example structure:
  // Session Details
  // Sarah Johnson
  // Monday, August 17
  // 09:00 AM
  // PT • 60 min

  return (
    <AppBottomSheet
      visible={visible}
      title="Session Details"
      onClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.memberName}>{session.name || session.member}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{session.type}</Text>
          </View>
        </View>

        <View style={styles.detailsList}>
          <View style={styles.detailItem}>
            <Feather name="calendar" size={18} color="#64748B" />
            <Text style={styles.detailText}>{session.date ? session.date : 'Unknown Date'}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Feather name="clock" size={18} color="#64748B" />
            <Text style={styles.detailText}>{session.time}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Feather name="activity" size={18} color="#64748B" />
            <Text style={styles.detailText}>{session.duration}</Text>
          </View>

          {!!session.location && (
            <View style={styles.detailItem}>
              <Feather name="map-pin" size={18} color="#64748B" />
              <Text style={styles.detailText}>{session.location}</Text>
            </View>
          )}

          {!!session.capacity && session.capacity > 0 && (
            <View style={styles.detailItem}>
              <Feather name="users" size={18} color="#64748B" />
              <Text style={styles.detailText}>Capacity: {session.capacity}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Button
            title="Edit Session"
            variant="outline"
            onPress={onEdit}
            style={styles.actionButton}
          />
          <Button
            title="Delete Session"
            variant="ghost"
            onPress={onDelete}
            style={[styles.actionButton, styles.deleteButton]}
          />
        </View>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  memberName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  badge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.trainerAmber,
  },
  detailsList: {
    gap: Spacing.three,
    marginBottom: Spacing.six,
    backgroundColor: '#F8FAFC',
    padding: Spacing.four,
    borderRadius: Radius.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  detailText: {
    fontSize: 15,
    color: '#334155',
  },
  actions: {
    gap: Spacing.three,
  },
  actionButton: {
    width: '100%',
  },
  deleteButton: {
    borderColor: '#EF4444',
    borderWidth: 1,
  },
});
