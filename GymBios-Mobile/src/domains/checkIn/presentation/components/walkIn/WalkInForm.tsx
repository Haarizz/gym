import { View, StyleSheet } from 'react-native';
import { Spacing, BrandColors, Radius } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import Feather from '@expo/vector-icons/Feather';

import { VisitorInformationSection } from './VisitorInformationSection';
import { DailyPlanSelector } from './DailyPlanSelector';

interface WalkInFormProps {
  fullName: string;
  onChangeFullName: (v: string) => void;
  phone: string;
  onChangePhone: (v: string) => void;
  photoUri: string | null;
  onPhotoChange: (v: string | null) => void;
  selectedPlanId: string;
  selectedPlanName: string;
  selectedPlanPrice: number;
  onSelectPlan: (id: string, name: string, price: number) => void;
}

export function WalkInForm({
  fullName,
  onChangeFullName,
  phone,
  onChangePhone,
  photoUri,
  onPhotoChange,
  selectedPlanId,
  selectedPlanName,
  selectedPlanPrice,
  onSelectPlan,
}: WalkInFormProps) {
  return (
    <View style={styles.container}>
      {/* Visitor Information */}
      <VisitorInformationSection
        fullName={fullName}
        onChangeFullName={onChangeFullName}
        phone={phone}
        onChangePhone={onChangePhone}
        photoUri={photoUri}
        onPhotoChange={onPhotoChange}
      />

      {/* Daily Plan */}
      <View style={styles.section}>
        <Typography variant="bodySmallBold" style={styles.sectionLabel}>
          Daily Plan *
        </Typography>
        <DailyPlanSelector
          selectedPlanId={selectedPlanId}
          selectedPlanName={selectedPlanName}
          onSelect={onSelectPlan}
        />

        {/* Plan pricing summary — shown after a plan is selected */}
        {selectedPlanId !== '' && selectedPlanPrice > 0 && (
          <View style={styles.priceSummary}>
            <Feather name="tag" size={14} color={BrandColors.teal} />
            <Typography variant="bodySmall" style={styles.priceText}>
              ₹{selectedPlanPrice}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              · {selectedPlanName}
            </Typography>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionLabel: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: `${BrandColors.teal}10`,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  priceText: {
    fontWeight: '700',
    color: BrandColors.teal,
  },
});

