import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { UrgentFollowUpItem } from '../../domain/StaffDashboardData';

interface StaffUrgentFollowUpsCardProps {
  followUps: UrgentFollowUpItem[];
  onViewAll?: () => void;
}

export function StaffUrgentFollowUpsCard({
  followUps,
  onViewAll,
}: StaffUrgentFollowUpsCardProps) {
  const router = useRouter();

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`).catch(() => {});
  };

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      router.push('/(staff)/followUps' as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Feather name="alert-circle" size={18} color="#EF4444" />
          <Text style={styles.title}>Urgent Follow-ups</Text>
        </View>
        <Pressable onPress={handleViewAll} hitSlop={8}>
          <Text style={styles.viewAllText}>View All</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {followUps.map((lead, idx) => {
          const isHigh = lead.priority === 'high';
          return (
            <View
              key={lead.id ?? idx}
              style={[
                styles.leadCard,
                isHigh ? styles.leadCardHigh : styles.leadCardMed,
              ]}
            >
              <View style={styles.leadHeader}>
                <View style={styles.leadInfo}>
                  <Text style={styles.leadName}>{lead.name}</Text>
                  <Text style={styles.leadInquiry}>{lead.inquiry}</Text>
                </View>
                <View
                  style={[
                    styles.priorityBadge,
                    isHigh ? styles.badgeHigh : styles.badgeMed,
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      isHigh ? styles.priorityTextHigh : styles.priorityTextMed,
                    ]}
                  >
                    {lead.priority.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.leadFooter}>
                <Text style={styles.lastContactText}>Last: {lead.lastContact}</Text>
                <Pressable
                  style={styles.callButton}
                  onPress={() => handleCall(lead.phone)}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${lead.name}`}
                >
                  <Feather name="phone" size={12} color="#FFFFFF" />
                  <Text style={styles.callButtonText}>Call Now</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.teal,
  },
  list: {
    gap: Spacing.two,
  },
  leadCard: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  leadCardHigh: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  leadCardMed: {
    borderColor: '#FEF08A',
    backgroundColor: '#FEFCE8',
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  leadInquiry: {
    fontSize: 12,
    color: '#475569',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  badgeHigh: {
    backgroundColor: '#FEE2E2',
  },
  badgeMed: {
    backgroundColor: '#FEF9C3',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  priorityTextHigh: {
    color: '#B91C1C',
  },
  priorityTextMed: {
    color: '#A16207',
  },
  leadFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastContactText: {
    fontSize: 11,
    color: '#64748B',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: BrandColors.teal,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  callButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
