import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRecentCheckIns } from '../../hooks/useRecentCheckIns';
import { Spacing } from '@/core/theme';

export function StaffCheckInStats() {
  const { summary } = useRecentCheckIns();

  const occupancy = Math.round((summary.active / 150) * 100) || 0;

  return (
    <View style={styles.statsGrid}>
      <View style={styles.row}>
        <View style={[styles.statCard, styles.highlight]}>
          <View style={styles.statTop}>
            <Text style={styles.statLabel}>Today's Check-ins</Text>
            <View style={[styles.statIcon, styles.iconTeal]}>
              <Feather name="log-in" size={14} color="#1c6e5a" />
            </View>
          </View>
          <Text style={[styles.statValue, styles.textTeal]}>{summary.total}</Text>
          <Text style={styles.statSub}>Total visits today</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <Text style={styles.statLabel}>Currently Active</Text>
            <View style={[styles.statIcon, styles.iconGreen]}>
              <Feather name="users" size={14} color="#2f9e6e" />
            </View>
          </View>
          <Text style={styles.statValue}>{summary.active}</Text>
          <Text style={styles.statSub}>Members in gym</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <Text style={styles.statLabel}>Occupancy Rate</Text>
            <View style={[styles.statIcon, styles.iconTeal]}>
              <Feather name="activity" size={14} color="#1c6e5a" />
            </View>
          </View>
          <Text style={styles.statValue}>{occupancy}%</Text>
          <Text style={styles.statSub}>of 150 capacity</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <Text style={styles.statLabel}>Daily Visitors</Text>
            <View style={[styles.statIcon, styles.iconBlue]}>
              <Feather name="user-plus" size={14} color="#3d6fd6" />
            </View>
          </View>
          <Text style={[styles.statValue, styles.textBlue]}>{summary.walkIns}</Text>
          <Text style={styles.statSub}>Walk-in passes today</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    paddingHorizontal: Spacing.three,
    marginBottom: 16,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e3ece9',
    shadowColor: '#0f4a3d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  highlight: {
    borderColor: '#1c6e5a',
    borderWidth: 1.5,
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#5b7770',
  },
  statIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTeal: {
    backgroundColor: '#e7f3ef',
  },
  iconGreen: {
    backgroundColor: '#e7f6ef',
  },
  iconBlue: {
    backgroundColor: '#eaf0fc',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
    color: '#173a32',
  },
  textTeal: {
    color: '#1c6e5a',
  },
  textBlue: {
    color: '#3d6fd6',
  },
  statSub: {
    fontSize: 10.5,
    color: '#8fa39d',
    marginTop: 4,
  },
});
