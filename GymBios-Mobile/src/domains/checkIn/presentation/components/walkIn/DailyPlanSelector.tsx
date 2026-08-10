import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { useWalkInPlans } from '../../hooks/useWalkInPlans';
import type { MembershipPlan } from '@/domains/membershipPlans/domain/MembershipPlan';

interface DailyPlanSelectorProps {
  selectedPlanId: string;
  selectedPlanName: string;
  onSelect: (id: string, name: string, price: number) => void;
}

export function DailyPlanSelector({ selectedPlanId, selectedPlanName, onSelect }: DailyPlanSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const { plans, isLoading } = useWalkInPlans();

  const handleSelect = (plan: MembershipPlan) => {
    onSelect(String(plan.id), plan.name, plan.price);
    setModalVisible(false);
  };

  const placeholder = isLoading
    ? 'Loading plans...'
    : plans.length === 0
      ? 'No walk-in plans configured'
      : 'Select a plan';

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        onPress={() => !isLoading && plans.length > 0 && setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Select daily plan"
      >
        <View style={styles.triggerContent}>
          <Typography
            variant="bodySmall"
            style={[styles.triggerText, !selectedPlanId && styles.placeholder]}
            numberOfLines={1}
          >
            {selectedPlanId ? selectedPlanName : placeholder}
          </Typography>
          <Feather name="chevron-down" size={16} color={BrandColors.textSecondary} />
        </View>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <Typography variant="subtitle" style={styles.sheetTitle}>
                  Select Daily Plan
                </Typography>
                <Typography variant="bodySmall" color="textSecondary" style={styles.sheetSubtitle}>
                  Choose a walk-in / daily visitor plan
                </Typography>

                <ScrollView
                  style={styles.planList}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.planListContent}
                >
                  {plans.map((plan) => {
                    const isSelected = String(plan.id) === selectedPlanId;
                    return (
                      <Pressable
                        key={plan.id}
                        style={({ pressed }) => [
                          styles.planRow,
                          isSelected && styles.planRowSelected,
                          pressed && styles.planRowPressed,
                        ]}
                        onPress={() => handleSelect(plan)}
                        accessibilityRole="button"
                      >
                        <View style={styles.planInfo}>
                          <Typography variant="body" style={styles.planName}>
                            {plan.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {plan.duration}
                          </Typography>
                        </View>
                        <View style={styles.planRight}>
                          <Typography variant="bodySmallBold" style={styles.planPrice}>
                            ₹{plan.price}
                          </Typography>
                          {isSelected && (
                            <Feather name="check-circle" size={18} color={BrandColors.teal} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  triggerPressed: {
    opacity: 0.7,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerText: {
    flex: 1,
    color: BrandColors.textPrimary,
  },
  placeholder: {
    color: BrandColors.textSecondary,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    maxHeight: '75%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: Spacing.three,
  },
  sheetTitle: {
    marginBottom: Spacing.one,
  },
  sheetSubtitle: {
    marginBottom: Spacing.three,
  },
  planList: {
    flex: 1,
  },
  planListContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  planRowSelected: {
    borderColor: BrandColors.teal,
    backgroundColor: `${BrandColors.teal}10`,
  },
  planRowPressed: {
    opacity: 0.75,
  },
  planInfo: {
    flex: 1,
    gap: 2,
  },
  planName: {
    fontWeight: '600',
  },
  planRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  planPrice: {
    color: BrandColors.teal,
  },
});

