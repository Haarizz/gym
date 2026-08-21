import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

interface FreezeMembershipModalProps {
  visible: boolean;
  daysAvailable: number;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (days: number, reason: string) => void;
}

const FREEZE_OPTIONS = [7, 14, 21, 30];
const FREEZE_REASONS = ['Travel / Vacation', 'Medical / Injury', 'Work / Relocation', 'Other'];

export function FreezeMembershipModal({
  visible,
  daysAvailable,
  isLoading,
  onClose,
  onConfirm,
}: FreezeMembershipModalProps) {
  const [selectedDays, setSelectedDays] = useState(FREEZE_OPTIONS[0]);
  const [customDays, setCustomDays] = useState('');
  const [selectedReason, setSelectedReason] = useState(FREEZE_REASONS[0]);

  const handleFreeze = () => {
    onConfirm(selectedDays, selectedReason);
  };

  const isValidDuration = selectedDays >= 1 && selectedDays <= daysAvailable;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Freeze Membership</Text>
              <Text style={styles.subtitle}>Up to {daysAvailable} days allowed per request</Text>
            </View>
            <Pressable hitSlop={12} onPress={onClose} style={styles.closeButton} disabled={isLoading}>
              <Feather name="x" size={20} color={BrandColors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <Text style={styles.sectionLabel}>Select Duration</Text>
            <View style={styles.daysRow}>
              {FREEZE_OPTIONS.map((days) => {
                const isSelected = selectedDays === days && customDays === '';
                const isDisabled = days > daysAvailable;
                return (
                  <Pressable
                    key={days}
                    style={[
                      styles.dayCard, 
                      isSelected && styles.dayCardSelected,
                      isDisabled && { opacity: 0.4 }
                    ]}
                    onPress={() => {
                      if (!isDisabled) {
                        setSelectedDays(days);
                        setCustomDays('');
                      }
                    }}
                    disabled={isDisabled || isLoading}
                  >
                    <Text style={[styles.dayNum, isSelected && styles.textSelected]}>{days}</Text>
                    <Text style={[styles.dayText, isSelected && styles.textSelected]}>Days</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.customDaysContainer}>
              <Text style={styles.customDaysLabel}>Or enter custom days:</Text>
              <TextInput
                style={styles.customDaysInput}
                keyboardType="numeric"
                value={customDays}
                onChangeText={(text) => {
                  setCustomDays(text);
                  const parsed = parseInt(text, 10);
                  if (!isNaN(parsed)) {
                    setSelectedDays(parsed);
                  } else {
                    setSelectedDays(0);
                  }
                }}
                placeholder="e.g. 5"
                placeholderTextColor="#94A3B8"
                maxLength={3}
                editable={!isLoading}
              />
            </View>

            <Text style={[styles.sectionLabel, { marginTop: Spacing.four }]}>Reason</Text>
            <View style={styles.reasonsList}>
              {FREEZE_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <Pressable
                    key={reason}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                    onPress={() => setSelectedReason(reason)}
                    disabled={isLoading}
                  >
                    <Feather
                      name={isSelected ? 'check-circle' : 'circle'}
                      size={18}
                      color={isSelected ? BrandColors.trainerAmber : '#94A3B8'}
                    />
                    <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                      {reason}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable 
              style={[styles.confirmButton, (isLoading || !isValidDuration) && { opacity: 0.7 }]} 
              onPress={handleFreeze}
              disabled={isLoading || !isValidDuration}
            >
              {isLoading ? (
                <Text style={styles.confirmButtonText}>Freezing...</Text>
              ) : (
                <Text style={styles.confirmButtonText}>
                  {isValidDuration ? `Freeze for ${selectedDays} Days` : 'Invalid Duration'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: BrandColors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: TypographyScale.title,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.screenBackground,
  },
  body: {
    padding: Spacing.four,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
  },
  daysRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dayCard: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.screenBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  dayCardSelected: {
    backgroundColor: BrandColors.trainerAmber,
    borderColor: BrandColors.trainerAmber,
  },
  dayNum: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  dayText: {
    fontSize: 10,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  textSelected: {
    color: '#FFFFFF',
  },
  customDaysContainer: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BrandColors.screenBackground,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  customDaysLabel: {
    fontSize: TypographyScale.body,
    fontWeight: '500',
    color: BrandColors.textPrimary,
  },
  customDaysInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    width: 80,
    fontSize: TypographyScale.body,
    color: BrandColors.textPrimary,
    textAlign: 'center',
  },
  reasonsList: {
    gap: Spacing.two,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.screenBackground,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonOptionSelected: {
    backgroundColor: '#FFFBEB',
    borderColor: BrandColors.trainerAmber,
  },
  reasonText: {
    fontSize: TypographyScale.body,
    color: BrandColors.textPrimary,
    fontWeight: '500',
  },
  reasonTextSelected: {
    color: BrandColors.trainerAmber,
    fontWeight: '700',
  },
  footer: {
    padding: Spacing.four,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  confirmButton: {
    backgroundColor: BrandColors.trainerAmber,
    paddingVertical: Spacing.four,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
