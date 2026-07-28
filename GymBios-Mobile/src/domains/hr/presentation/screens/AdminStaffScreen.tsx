import React from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { ScreenLayout } from '@/shared/layouts';
import type { createUseRestoreSession } from '@/domains/auth/presentation/hooks/useAuthFlow';

interface AdminStaffScreenProps {
  useRestoreSession: ReturnType<typeof createUseRestoreSession>;
}

export function createAdminStaffScreen(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function AdminStaffScreen() {
    const { logout, isLoggingOut } = useRestoreSession();

    const staffMembers = [
      {
        name: 'Rahul Sharma',
        role: 'Sales Manager',
        target: '₹2L',
        achieved: '₹2.4L',
        conversion: '85%',
        ptHandled: 24,
        attendance: '95%',
        rating: 4.8,
        status: 'excellent',
      },
      {
        name: 'Priya Patel',
        role: 'Front Desk',
        target: '₹1.5L',
        achieved: '₹1.6L',
        conversion: '78%',
        ptHandled: 18,
        attendance: '92%',
        rating: 4.6,
        status: 'on-track',
      },
      {
        name: 'Amit Kumar',
        role: 'Sales Executive',
        target: '₹1.8L',
        achieved: '₹1.3L',
        conversion: '62%',
        ptHandled: 12,
        attendance: '88%',
        rating: 4.2,
        status: 'at-risk',
      },
    ];

    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'excellent':
          return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
        case 'on-track':
          return { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' };
        case 'at-risk':
          return { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' };
        default:
          return { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
      }
    };

    return (
      <ScreenLayout scrollable>
        <View style={styles.container}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Feather name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search staff by name or role..."
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Staff</Text>
              <Text style={styles.summaryValue}>20</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Present</Text>
              <Text style={[styles.summaryValue, { color: '#16a34a' }]}>18</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Absent</Text>
              <Text style={[styles.summaryValue, { color: '#dc2626' }]}>2</Text>
            </View>
          </View>

          {/* Staff List */}
          <View style={styles.staffList}>
            {staffMembers.map((staff, index) => {
              const statusStyle = getStatusStyle(staff.status);
              const initials = staff.name.split(' ').map(n => n[0]).join('');

              return (
                <View key={index} style={styles.staffCard}>
                  {/* Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.staffInfo}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>
                      <View>
                        <Text style={styles.staffName}>{staff.name}</Text>
                        <Text style={styles.staffRole}>{staff.role}</Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: statusStyle.bg,
                          borderColor: statusStyle.border,
                        },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {staff.status.replace('-', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Performance Metrics */}
                  <View style={styles.metricsRow}>
                    <View style={styles.metricBox}>
                      <View style={styles.metricTitleRow}>
                        <Feather name="target" size={12} color="#4b5563" />
                        <Text style={styles.metricLabel}>Target Achievement</Text>
                      </View>
                      <Text style={styles.metricValue}>
                        {staff.achieved} / {staff.target}
                      </Text>
                    </View>
                    <View style={styles.metricBox}>
                      <View style={styles.metricTitleRow}>
                        <Feather name="trending-up" size={12} color="#4b5563" />
                        <Text style={styles.metricLabel}>Conversion</Text>
                      </View>
                      <Text style={styles.metricValue}>{staff.conversion}</Text>
                    </View>
                  </View>

                  {/* Additional Stats */}
                  <View style={styles.statsFooter}>
                    <View style={styles.statItem}>
                      <Feather name="calendar" size={12} color="#4b5563" />
                      <Text style={styles.statText}>PT: {staff.ptHandled}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Feather name="trending-up" size={12} color="#4b5563" />
                      <Text style={styles.statText}>Attendance: {staff.attendance}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Feather name="star" size={12} color="#eab308" />
                      <Text style={[styles.statText, { color: '#111827', fontWeight: '500' }]}>
                        {staff.rating}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.detailsButton}>
                      <Text style={styles.detailsButtonText}>View Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.messageButton}>
                      <Feather name="message-circle" size={16} color="#374151" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Add Staff Button */}
          <TouchableOpacity style={styles.addStaffButton}>
            <Text style={styles.addStaffButtonText}>+ Add New Staff Member</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: Spacing.three,
    borderRadius: Radius.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: Spacing.one,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  staffList: {
    gap: Spacing.three,
  },
  staffCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BrandColors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  staffName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  staffRole: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: Spacing.two,
    borderRadius: Radius.sm,
  },
  metricTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: '#4b5563',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: Spacing.three,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#4b5563',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  detailsButton: {
    flex: 1,
    backgroundColor: BrandColors.teal,
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  messageButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    backgroundColor: '#f3f4f6',
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addStaffButton: {
    backgroundColor: BrandColors.teal,
    paddingVertical: Spacing.four,
    borderRadius: Radius.md,
    alignItems: 'center',
    shadowColor: BrandColors.teal,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  addStaffButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
