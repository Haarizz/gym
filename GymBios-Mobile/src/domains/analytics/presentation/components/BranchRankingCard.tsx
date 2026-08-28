import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

interface BranchRankingData {
  rank: number;
  branchName: string;
  rating: number;
  revenue: number;
  members: number;
}

interface BranchRankingCardProps {
  data: BranchRankingData[];
}

export function BranchRankingCard({ data }: BranchRankingCardProps) {
  if (!data || data.length === 0) return null;

  const getRankColor = (index: number) => {
    if (index === 0) return '#F5C742';
    if (index === 1) return '#F59E0B';
    return '#9CA3AF'; // gray-400
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Branch Rankings</Text>
      
      <View style={styles.listContainer}>
        {data.map((branch, index) => (
          <View key={branch.branchName} style={styles.branchItem}>
            <View style={styles.branchHeader}>
              <View style={styles.rankContainer}>
                <View style={[styles.rankBadge, { backgroundColor: getRankColor(index) }]}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <Text style={styles.branchName}>{branch.branchName}</Text>
              </View>
              
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingText}>{branch.rating.toFixed(1)}</Text>
                <Feather name="star" size={14} color="#EAB308" style={{ marginTop: -2 }} />
              </View>
            </View>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Revenue</Text>
                <Text style={styles.statValue}>₹{(branch.revenue / 1000).toFixed(0)}K</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Members</Text>
                <Text style={styles.statValue}>{branch.members}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: Spacing.four,
  },
  title: {
    fontSize: TypographyScale.body,
    fontWeight: '600',
    color: '#111827', // gray-900
    marginBottom: Spacing.four,
  },
  listContainer: {
    gap: Spacing.three,
  },
  branchItem: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  branchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  branchName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#4B5563', // gray-600
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
});
