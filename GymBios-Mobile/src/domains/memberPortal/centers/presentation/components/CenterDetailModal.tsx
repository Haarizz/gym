import { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { toast } from '@/shared/components/Toasts/toastStore';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import type { CenterItem } from './CenterCard';
import { PlanCard, type MembershipPlanItem } from './PlanCard';
import { PlanPurchaseModal } from './PlanPurchaseModal';

interface CenterDetailModalProps {
  visible: boolean;
  center: CenterItem | null;
  onClose: () => void;
}

export function CenterDetailModal({ visible, center, onClose }: CenterDetailModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlanItem | null>(null);
  const [isPurchaseModalVisible, setIsPurchaseModalVisible] = useState(false);

  if (!center) return null;

  const handleCall = () => {
    Linking.openURL(`tel:${center.phone}`).catch(() => {
      toast.info(`Call center at ${center.phone}`, { title: 'Phone Call' });
    });
  };

  const handleNavigate = () => {
    toast.info(`Navigating to ${center.name}, ${center.address}`, { title: 'Directions' });
  };

  const handleSelectPlan = (plan: MembershipPlanItem) => {
    setSelectedPlan(plan);
    setIsPurchaseModalVisible(true);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <Pressable hitSlop={12} onPress={onClose} style={styles.backButton}>
              <Feather name="chevron-left" size={24} color={BrandColors.textPrimary} />
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {center.name}
            </Text>
            <Pressable hitSlop={12} onPress={handleCall} style={styles.phoneButton}>
              <Feather name="phone" size={18} color={BrandColors.teal} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Hero Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{center.category}</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Feather name="star" size={13} color="#F59E0B" />
                  <Text style={styles.ratingText}>{center.rating}</Text>
                  <Text style={styles.reviewsText}>({center.reviews})</Text>
                </View>
              </View>

              <Text style={styles.heroName}>{center.name}</Text>
              <Text style={styles.heroAddress}>{center.address}</Text>

              <View style={styles.heroActions}>
                <Pressable style={styles.directionButton} onPress={handleNavigate}>
                  <Feather name="navigation" size={14} color="#FFFFFF" />
                  <Text style={styles.directionButtonText}>Directions ({center.distance})</Text>
                </Pressable>
                <Pressable style={styles.callActionButton} onPress={handleCall}>
                  <Feather name="phone-call" size={14} color={BrandColors.teal} />
                  <Text style={styles.callActionText}>Call</Text>
                </Pressable>
              </View>
            </View>

            {/* About Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>About This Center</Text>
              <Text style={styles.aboutText}>{center.about}</Text>

              <View style={styles.timingBox}>
                <Feather name="clock" size={16} color={BrandColors.trainerAmber} />
                <View style={styles.timingInfo}>
                  <Text style={styles.timingLabel}>Timings</Text>
                  <Text style={styles.timingText}>{center.timings}</Text>
                </View>
              </View>

              <View style={styles.genderBox}>
                <Feather name="users" size={16} color={BrandColors.teal} />
                <View style={styles.timingInfo}>
                  <Text style={styles.timingLabel}>Access Type</Text>
                  <Text style={styles.timingText}>{center.genderType}</Text>
                </View>
              </View>
            </View>

            {/* Facilities Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Amenities & Facilities</Text>
              <View style={styles.facilityGrid}>
                {center.facilities.map((fac, idx) => (
                  <View key={idx} style={styles.facilityCard}>
                    <Feather name="check-circle" size={14} color={BrandColors.teal} />
                    <Text style={styles.facilityName}>{fac}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Certified Trainers */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Certified Trainers</Text>
              <View style={styles.trainerList}>
                {center.trainers.map((trainer, idx) => (
                  <View key={idx} style={styles.trainerItem}>
                    <View style={styles.trainerAvatar}>
                      <Text style={styles.trainerAvatarText}>{trainer.avatar}</Text>
                    </View>
                    <View style={styles.trainerInfo}>
                      <Text style={styles.trainerName}>{trainer.name}</Text>
                      <Text style={styles.trainerSpecialty}>{trainer.specialty}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Membership Plans */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Membership Plans</Text>
              <Text style={styles.plansSubtitle}>Select a plan to join this center</Text>
              <View style={styles.plansList}>
                {center.plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} onSelect={handleSelectPlan} />
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Plan Purchase Modal */}
      <PlanPurchaseModal
        visible={isPurchaseModalVisible}
        plan={selectedPlan}
        center={center}
        onClose={() => setIsPurchaseModalVisible(false)}
        onSuccess={() => {
          setIsPurchaseModalVisible(false);
          onClose();
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
    marginTop: 40,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    overflow: 'hidden',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    backgroundColor: BrandColors.surface,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  backButton: {
    padding: Spacing.one,
  },
  headerTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.two,
  },
  phoneButton: {
    padding: Spacing.two,
    borderRadius: Radius.full,
    backgroundColor: '#F0FDFA',
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six + 40,
  },
  heroCard: {
    backgroundColor: BrandColors.tealDark,
    borderRadius: Radius.lg,
    padding: Spacing.four + 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  reviewsText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroAddress: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: Spacing.four,
  },
  heroActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  directionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BrandColors.teal,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
  directionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  callActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
  callActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.teal,
  },
  sectionCard: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeading: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.three,
  },
  aboutText: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.three,
  },
  timingBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + 2,
    backgroundColor: '#FEF3C7',
    padding: Spacing.three,
    borderRadius: Radius.md,
    marginBottom: Spacing.two,
  },
  genderBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + 2,
    backgroundColor: '#CCFBF1',
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  timingInfo: {
    flex: 1,
  },
  timingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
  },
  timingText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    marginTop: 2,
  },
  facilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  facilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '48%',
    backgroundColor: BrandColors.screenBackground,
    padding: Spacing.two + 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  facilityName: {
    fontSize: TypographyScale.small,
    color: BrandColors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  trainerList: {
    gap: Spacing.three,
  },
  trainerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two + 2,
    backgroundColor: BrandColors.screenBackground,
    borderRadius: Radius.md,
  },
  trainerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BrandColors.trainerAmber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainerAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  trainerInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  trainerSpecialty: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginTop: 1,
  },
  plansSubtitle: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginBottom: Spacing.three,
  },
  plansList: {
    marginTop: Spacing.two,
  },
});
