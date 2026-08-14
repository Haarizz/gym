import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/shared/components/AppHeader';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { BrandColors, Spacing, TypographyScale, Radius } from '@/core/theme';
import { useMessagingHistory } from '../../hooks/useMessagingHooks';

export function MessagingHistoryScreen() {
  const router = useRouter();
  const { data: history = [], isLoading } = useMessagingHistory();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <AppHeader
        title="Message History"
        subtitle="View sent & scheduled messages"
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={() => router.back()}
      />
      
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.subject}>{item.subject}</Text>
              <StatusBadge status={item.status} />
            </View>
            
            <Text style={styles.type}>Channel: {item.type.toUpperCase()}</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Recipients</Text>
                <Text style={styles.statValue}>{item.recipientCount}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Open Rate</Text>
                <Text style={styles.statValue}>{(item.openRate * 100).toFixed(1)}%</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Sent Date</Text>
                <Text style={styles.statValue}>
                  {new Date(item.sentDate).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No message history found.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  listContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  historyCard: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.two,
  },
  subject: {
    fontSize: TypographyScale.body,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    flex: 1,
    marginRight: Spacing.three,
  },
  type: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginBottom: Spacing.three,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: BrandColors.screenBackground,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: TypographyScale.caption,
    color: BrandColors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: TypographyScale.small,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  emptyContainer: {
    padding: Spacing.six,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
  },
});
