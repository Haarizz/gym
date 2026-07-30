import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { ScreenLayout } from '@/shared/layouts';
import { StatCard } from '@/shared/components';
import type { createUseRestoreSession } from '@/domains/auth/presentation/hooks/useAuthFlow';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet/AppBottomSheet';
import { CollectionsReport } from '@/domains/admin/presentation/components/reports/CollectionsReport';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReportId =
  | 'total-collections'
  | 'membership-sales'
  | 'pos-revenue'
  | 'pt-sales'
  | 'day-pass'
  | 'active-members'
  | 'churn-rate'
  | 'retention-rate';

interface AdminDashboardScreenProps {
  useRestoreSession: ReturnType<typeof createUseRestoreSession>;
}

// ---------------------------------------------------------------------------
// Report configuration – single source of truth.
//
// To add a new report:
//   1. Implement the report component.
//   2. Add an entry below with `enabled: true` and the component reference.
//
// Disabled entries are shown in the KPI grid but are not tappable.
// ---------------------------------------------------------------------------

type ReportConfig = {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any> | null;
  enabled: boolean;
};

const REPORT_CONFIG: Record<ReportId, ReportConfig> = {
  'total-collections': {
    title: 'Collections Report',
    component: CollectionsReport,
    enabled: true,
  },
  'membership-sales': {
    title: 'Membership Sales',
    component: null,
    enabled: false,
  },
  'pos-revenue': {
    title: 'POS Revenue',
    component: null,
    enabled: false,
  },
  'pt-sales': {
    title: 'PT Sales',
    component: null,
    enabled: false,
  },
  'day-pass': {
    title: 'Day Pass Revenue',
    component: null,
    enabled: false,
  },
  'active-members': {
    title: 'Active Members',
    component: null,
    enabled: false,
  },
  'churn-rate': {
    title: 'Churn Report',
    component: null,
    enabled: false,
  },
  'retention-rate': {
    title: 'Retention Report',
    component: null,
    enabled: false,
  },
};

const DASHBOARD_SPACING = {
  headerToFilter: 16,
  filterToDate: 20,
  dateToAlerts: 16,
  betweenAlerts: 12,
  alertsToKpi: 24,
  sectionGap: 24,
};

export function createAdminDashboardScreen(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function AdminDashboardScreen() {
    const { logout, isLoggingOut } = useRestoreSession();

    // The report whose sheet is currently open. null means sheet is closed.
    const [activeReport, setActiveReport] = useState<ReportId | null>(null);

    // Derive the active config entry once – avoids repeated lookups.
    const report = activeReport ? REPORT_CONFIG[activeReport] : null;

    const kpiData = [
      { id: 'total-collections', label: 'Collections', value: '₹2.4L', change: '+12%', trend: 'up', icon: 'dollar-sign', color: '#22c55e', clickable: true },
      { id: 'membership-sales', label: 'Memberships', value: '₹1.8L', change: '+8%', trend: 'up', icon: 'user-check', color: BrandColors.teal, clickable: true },
      { id: 'pos-revenue', label: 'POS Revenue', value: '₹52K', change: '+18%', trend: 'up', icon: 'shopping-bag', color: '#F5C742', clickable: true },
      { id: 'pt-sales', label: 'PT Sales', value: '₹45K', change: '+15%', trend: 'up', icon: 'users', color: '#F59E0B', clickable: true },
      { id: 'active-members', label: 'Active Members', value: '1,245', change: '+2%', trend: 'up', icon: 'users', color: BrandColors.teal, clickable: true },
      { id: 'retention-rate', label: 'Retention', value: '89.4%', change: '+1.2%', trend: 'up', icon: 'user-plus', color: '#16a34a', clickable: true },
    ];

    const alerts = [
      { text: '24 memberships expiring in 7 days', urgent: true },
      { text: '12 pending follow-ups for today', urgent: false },
    ];

    return (
      <ScreenLayout scrollable>
        <View style={styles.container}>
          {/* Branch Filter — floating surface bridging the header and content */}
          <View style={styles.branchFilterCard}>
            <View style={styles.dropdown}>
              <Text style={styles.dropdownText}>All Branches</Text>
              <Feather name="chevron-down" size={16} color="#6b7280" />
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.iconButton}>
                <Feather name="calendar" size={20} color="#4b5563" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Feather name="refresh-cw" size={20} color="#4b5563" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Date and Alerts Header */}
          <View style={styles.dateHeader}>
            <Text style={styles.dateText}>Today: March 26, 2026</Text>
            <TouchableOpacity style={styles.bellButton}>
              <Feather name="bell" size={20} color="#4b5563" />
              <View style={styles.badge} />
            </TouchableOpacity>
          </View>

          {/* Alerts */}
          <View style={styles.alertsGroup}>
            {alerts.map((alert, index) => (
              <View
                key={index}
                style={[
                  styles.alertBox,
                  alert.urgent ? styles.alertUrgent : styles.alertNormal,
                ]}
              >
                <Feather
                  name="bell"
                  size={16}
                  color={alert.urgent ? '#dc2626' : '#d97706'}
                />
                <Text
                  style={[
                    styles.alertText,
                    alert.urgent ? styles.alertTextUrgent : styles.alertTextNormal,
                  ]}
                >
                  {alert.text}
                </Text>
              </View>
            ))}
          </View>

          {/* KPI Grid */}
          <View style={styles.kpiGrid}>
            {kpiData.map((kpi, index) => {
              // Only allow tapping KPIs that have an implemented report.
              const reportEntry = REPORT_CONFIG[kpi.id as ReportId];
              const handlePress = reportEntry?.enabled
                ? () => setActiveReport(kpi.id as ReportId)
                : undefined;

              return (
                <View key={index} style={styles.kpiWrapper}>
                  <StatCard
                    label={kpi.label}
                    value={kpi.value}
                    iconName={kpi.icon as any}
                    color={kpi.color}
                    onPress={handlePress}
                  />
                </View>
              );
            })}
          </View>

          {/* Operational Highlights */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Operational Highlights</Text>
            <View style={styles.highlightRow}>
              <Text style={styles.highlightLabel}>Staff Attendance</Text>
              <Text style={styles.highlightValue}>18/20</Text>
            </View>
            <View style={styles.highlightRow}>
              <Text style={styles.highlightLabel}>Today's Footfall</Text>
              <Text style={styles.highlightValue}>342 visits</Text>
            </View>
            <View style={styles.highlightRow}>
              <Text style={styles.highlightLabel}>Renewals Due (7 days)</Text>
              <Text style={[styles.highlightValue, { color: '#dc2626' }]}>24 members</Text>
            </View>
            <View style={[styles.highlightRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.highlightLabel}>Pending Follow-ups</Text>
              <Text style={[styles.highlightValue, { color: '#d97706' }]}>12 leads</Text>
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => logout()}
            disabled={isLoggingOut}
          >
            <Text style={styles.logoutText}>
              {isLoggingOut ? 'Signing out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>

          <AppBottomSheet
            visible={!!report}
            title={report?.title ?? ''}
            subtitle="Detailed breakdown"
            onClose={() => setActiveReport(null)}
          >
            {report?.component ? <report.component /> : null}
          </AppBottomSheet>
        </View>
      </ScreenLayout>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    // No vertical padding/gap here — every section below owns its own
    // spacing to the section above it, per DASHBOARD_SPACING. This keeps
    // the "consistent scale, not arbitrary margins" requirement enforced
    // in one place instead of scattered across the screen.
  },

  // Branch Filter — now a floating card instead of a plain row.
  branchFilterCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: Spacing.three,
    borderRadius: Radius.md,
    marginTop: -24, // pulls the card up so it visually bridges the header
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: Spacing.two,
    flex: 1,
    marginRight: Spacing.three,
  },
  dropdownText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  iconButton: {
    padding: Spacing.two,
    backgroundColor: '#f9fafb',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  dateHeader: {
    marginTop: DASHBOARD_SPACING.filterToDate,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#4b5563',
  },
  bellButton: {
    padding: Spacing.two,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    backgroundColor: '#ef4444',
    borderRadius: 4,
  },

  alertsGroup: {
    marginTop: DASHBOARD_SPACING.dateToAlerts,
    gap: DASHBOARD_SPACING.betweenAlerts,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.two,
  },
  alertUrgent: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  alertNormal: {
    backgroundColor: '#fefce8',
    borderColor: '#fef08a',
  },
  alertText: {
    fontSize: 13,
  },
  alertTextUrgent: {
    color: '#991b1b',
  },
  alertTextNormal: {
    color: '#854d0e',
  },

  kpiGrid: {
    marginTop: DASHBOARD_SPACING.alertsToKpi,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  kpiWrapper: {
    width: '47%',
  },

  card: {
    marginTop: DASHBOARD_SPACING.sectionGap,
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: Spacing.three,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  highlightLabel: {
    fontSize: 13,
    color: '#4b5563',
  },
  highlightValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  logoutButton: {
    marginTop: DASHBOARD_SPACING.sectionGap,
    backgroundColor: '#f3f4f6',
    padding: Spacing.four,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  logoutText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
});