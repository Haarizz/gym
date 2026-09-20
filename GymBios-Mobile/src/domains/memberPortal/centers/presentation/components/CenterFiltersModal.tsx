import { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

export interface CenterFilters {
  category: string;
  priceRange: '' | 'under2k' | '2k-5k' | 'above5k';
  accessType: string;
  paymentMode: string;
}

export const DEFAULT_CENTER_FILTERS: CenterFilters = {
  category: 'All',
  priceRange: '',
  accessType: '',
  paymentMode: '',
};

interface CenterFiltersModalProps {
  visible: boolean;
  filters: CenterFilters;
  sortBy: string;
  onChangeFilters: (filters: CenterFilters) => void;
  onSelectSort: (sort: string) => void;
  onReset: () => void;
  onClose: () => void;
}

const CATEGORIES = ['All', 'Gym', 'Fitness Center', 'Wellness Center', 'Studio'];
const PRICE_RANGES: { value: CenterFilters['priceRange']; label: string }[] = [
  { value: 'under2k', label: 'Under ₹2,000' },
  { value: '2k-5k', label: '₹2,000–₹5,000' },
  { value: 'above5k', label: 'Above ₹5,000' },
];
const ACCESS_TYPES = ['Mixed', 'Ladies Only', 'Men Only'];
const PAYMENT_MODES = [
  { value: 'Cash', label: 'Cash', icon: 'dollar-sign' as const },
  { value: 'Card', label: 'Card', icon: 'credit-card' as const },
  { value: 'BNPL', label: 'BNPL', icon: 'zap' as const },
];
const SORTS = ['Distance', 'Price', 'Rating'];

export function CenterFiltersModal({
  visible,
  filters,
  sortBy,
  onChangeFilters,
  onSelectSort,
  onReset,
  onClose,
}: CenterFiltersModalProps) {
  const [local, setLocal] = useState<CenterFilters>(filters);

  useEffect(() => {
    if (visible) setLocal(filters);
  }, [visible, filters]);

  const toggle = <K extends keyof CenterFilters>(key: K, value: CenterFilters[K]) => {
    setLocal((prev) => ({
      ...prev,
      [key]: prev[key] === value ? (key === 'category' ? 'All' : '') : value,
    }));
  };

  const activeCount =
    (local.category !== 'All' ? 1 : 0) +
    (local.priceRange ? 1 : 0) +
    (local.accessType ? 1 : 0) +
    (local.paymentMode ? 1 : 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Filter Centers</Text>
              <Text style={styles.subtitle}>Refine your fitness center search</Text>
            </View>
            <Pressable hitSlop={12} onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={20} color={BrandColors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Category */}
            <Text style={styles.sectionTitle}>Center Type</Text>
            <View style={styles.chipGroup}>
              {CATEGORIES.map((cat) => {
                const isSelected = local.category === cat;
                return (
                  <Pressable
                    key={cat}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setLocal((prev) => ({ ...prev, category: cat }))}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{cat}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Price Range */}
            <Text style={[styles.sectionTitle, { marginTop: Spacing.four }]}>Monthly Price</Text>
            <View style={styles.chipGroup}>
              {PRICE_RANGES.map(({ value, label }) => {
                const isSelected = local.priceRange === value;
                return (
                  <Pressable
                    key={value}
                    style={[styles.chip, isSelected && styles.chipSelectedGold]}
                    onPress={() => toggle('priceRange', value)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelectedGold]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Access Type */}
            <Text style={[styles.sectionTitle, { marginTop: Spacing.four }]}>Access Type</Text>
            <View style={styles.chipGroup}>
              {ACCESS_TYPES.map((type) => {
                const isSelected = local.accessType === type;
                return (
                  <Pressable
                    key={type}
                    style={[styles.chip, isSelected && styles.chipSelectedPink]}
                    onPress={() => toggle('accessType', type)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelectedPink]}>{type}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Payment Method */}
            <Text style={[styles.sectionTitle, { marginTop: Spacing.four }]}>Payment Options</Text>
            <View style={styles.chipGroup}>
              {PAYMENT_MODES.map(({ value, label, icon }) => {
                const isSelected = local.paymentMode === value;
                return (
                  <Pressable
                    key={value}
                    style={[styles.chip, styles.chipWithIcon, isSelected && styles.chipSelected]}
                    onPress={() => toggle('paymentMode', value)}
                  >
                    <Feather name={icon} size={13} color={isSelected ? BrandColors.teal : BrandColors.textSecondary} />
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Sort By */}
            <Text style={[styles.sectionTitle, { marginTop: Spacing.four }]}>Sort By</Text>
            <View style={styles.chipGroup}>
              {SORTS.map((sort) => {
                const isSelected = sortBy === sort;
                return (
                  <Pressable
                    key={sort}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => onSelectSort(sort)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{sort}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={styles.resetButton}
              onPress={() => {
                setLocal(DEFAULT_CENTER_FILTERS);
                onReset();
              }}
            >
              <Text style={styles.resetButtonText}>Reset{activeCount > 0 ? ` (${activeCount})` : ''}</Text>
            </Pressable>
            <Pressable
              style={styles.applyButtonWrapper}
              onPress={() => {
                onChangeFilters(local);
                onClose();
              }}
            >
              <LinearGradient
                colors={[BrandColors.memberGold, BrandColors.trainerAmber]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.applyButton}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </LinearGradient>
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
    maxHeight: '85%',
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.screenBackground,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  chipWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipSelected: {
    borderColor: BrandColors.teal,
    backgroundColor: '#F0FDFA',
  },
  chipSelectedGold: {
    borderColor: BrandColors.memberGold,
    backgroundColor: 'rgba(245, 199, 66, 0.12)',
  },
  chipSelectedPink: {
    borderColor: '#F472B6',
    backgroundColor: '#FCE7F3',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  chipTextSelected: {
    color: BrandColors.teal,
    fontWeight: '700',
  },
  chipTextSelectedGold: {
    color: BrandColors.trainerAmber,
    fontWeight: '700',
  },
  chipTextSelectedPink: {
    color: '#BE185D',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.four,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: BrandColors.surface,
  },
  resetButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.textSecondary,
  },
  applyButtonWrapper: {
    flex: 2,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  applyButton: {
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
