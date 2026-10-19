import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import { useRecentCheckIns } from '../../hooks/useRecentCheckIns';
import { Spacing } from '@/core/theme';
import { useCheckInTheme } from '../../hooks/useCheckInTheme';

export function StaffCheckInStats() {
  const { t } = useTranslation();
  const { summary } = useRecentCheckIns();
  const theme = useCheckInTheme();

  const occupancy = Math.round((summary.active / 150) * 100) || 0;

  return (
    <View style={styles.statsGrid}>
      <View style={styles.row}>
        <View style={[styles.statCard, styles.highlight, { borderColor: theme.accent }]}>
          <View style={styles.statTop}>
            <Text style={styles.statLabel}>{t('checkIn.staff.todaysCheckIns')}</Text>
            <View style={[styles.statIcon, { backgroundColor: theme.accentSoft }]}>
              <Feather name="log-in" size={14} color={theme.accent} />
            </View>
          </View>
          <Text style={[styles.statValue, { color: theme.accent }]}>{summary.total}</Text>
          <Text style={styles.statSub}>{t('checkIn.hub.stats.totalVisitsToday')}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <Text style={styles.statLabel}>{t('checkIn.staff.currentlyActive')}</Text>
            <View style={[styles.statIcon, styles.iconGreen]}>
              <Feather name="users" size={14} color="#2f9e6e" />
            </View>
          </View>
          <Text style={styles.statValue}>{summary.active}</Text>
          <Text style={styles.statSub}>{t('checkIn.hub.stats.membersInGym')}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <Text style={styles.statLabel}>{t('checkIn.staff.occupancyRate')}</Text>
            <View style={[styles.statIcon, { backgroundColor: theme.accentSoft }]}>
              <Feather name="activity" size={14} color={theme.accent} />
            </View>
          </View>
          <Text style={styles.statValue}>{occupancy}%</Text>
          <Text style={styles.statSub}>{t('checkIn.hub.stats.capacitySubtitle', { count: 150 })}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <Text style={styles.statLabel}>{t('checkIn.staff.dailyVisitors')}</Text>
            <View style={[styles.statIcon, styles.iconBlue]}>
              <Feather name="user-plus" size={14} color="#3d6fd6" />
            </View>
          </View>
          <Text style={[styles.statValue, styles.textBlue]}>{summary.walkIns}</Text>
          <Text style={styles.statSub}>{t('checkIn.hub.stats.walkInPassesToday')}</Text>
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
  textBlue: {
    color: '#3d6fd6',
  },
  statSub: {
    fontSize: 10.5,
    color: '#8fa39d',
    marginTop: 4,
  },
});
