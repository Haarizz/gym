import { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import { tOr } from '@/core/i18n';
import Feather from '@expo/vector-icons/Feather';
import { FeatherIcon } from '@/shared/components/CurrencyIcon';
import { LinearGradient } from 'expo-linear-gradient';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import {
  PRICE_SLIDER_MAX,
  PRICE_SLIDER_MIN,
  PriceRangeLabel,
  PriceRangeSlider,
  isPriceRangeActive,
} from './PriceRangeSlider';

export interface CenterFilters {
  category: string;
  /** Monthly price bounds; the slider ends (PRICE_SLIDER_MIN/MAX) mean unbounded. */
  priceMin: number;
  priceMax: number;
  accessType: string;
  paymentMode: string;
}

export const DEFAULT_CENTER_FILTERS: CenterFilters = {
  category: 'All',
  priceMin: PRICE_SLIDER_MIN,
  priceMax: PRICE_SLIDER_MAX,
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
const ACCESS_TYPES = ['Mixed', 'Ladies Only', 'Men Only'];
const PAYMENT_MODES = [
  { value: 'Cash', icon: 'dollar-sign' as const },
  { value: 'Card', icon: 'credit-card' as const },
  { value: 'BNPL', icon: 'zap' as const },
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
  const { t } = useTranslation();
  const [local, setLocal] = useState<CenterFilters>(filters);
  const [isDraggingPrice, setIsDraggingPrice] = useState(false);
  const isPriceActive = isPriceRangeActive(local.priceMin, local.priceMax);

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
    (isPriceActive ? 1 : 0) +
    (local.accessType ? 1 : 0) +
    (local.paymentMode ? 1 : 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t('centers.filtersModal.title')}</Text>
              <Text style={styles.subtitle}>{t('centers.filtersModal.subtitle')}</Text>
            </View>
            <Pressable hitSlop={12} onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={20} color={BrandColors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!isDraggingPrice}
          >
            {/* Category */}
            <Text style={styles.sectionTitle}>{t('centers.filtersModal.centerType')}</Text>
            <View style={styles.chipGroup}>
              {CATEGORIES.map((cat) => {
                const isSelected = local.category === cat;
                return (
                  <Pressable
                    key={cat}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setLocal((prev) => ({ ...prev, category: cat }))}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{tOr(`centers.categories.${cat}`, cat)}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Price Range */}
            <View style={[styles.priceHeader, { marginTop: Spacing.four }]}>
              <Text style={[styles.sectionTitle, styles.priceTitle]}>{t('centers.filtersModal.monthlyPrice')}</Text>
              <Text style={[styles.priceValue, isPriceActive && styles.priceValueActive]} numberOfLines={1}>
                {isPriceActive ? (
                  <PriceRangeLabel min={local.priceMin} max={local.priceMax} />
                ) : (
                  t('centers.filtersModal.anyPrice')
                )}
              </Text>
            </View>
            <PriceRangeSlider
              min={local.priceMin}
              max={local.priceMax}
              onChange={(priceMin, priceMax) => setLocal((prev) => ({ ...prev, priceMin, priceMax }))}
              onDragStateChange={setIsDraggingPrice}
            />
            <View style={styles.priceBounds}>
              <Text style={styles.priceBoundText}><CurrencyValue amount={PRICE_SLIDER_MIN} /></Text>
              <Text style={styles.priceBoundText}><CurrencyValue amount={PRICE_SLIDER_MAX} />+</Text>
            </View>

            {/* Access Type */}
            <Text style={[styles.sectionTitle, { marginTop: Spacing.four }]}>{t('centers.filtersModal.accessType')}</Text>
            <View style={styles.chipGroup}>
              {ACCESS_TYPES.map((type) => {
                const isSelected = local.accessType === type;
                return (
                  <Pressable
                    key={type}
                    style={[styles.chip, isSelected && styles.chipSelectedPink]}
                    onPress={() => toggle('accessType', type)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelectedPink]}>{tOr(`centers.accessTypes.${type}`, type)}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Payment Method */}
            <Text style={[styles.sectionTitle, { marginTop: Spacing.four }]}>{t('centers.filtersModal.paymentOptions')}</Text>
            <View style={styles.chipGroup}>
              {PAYMENT_MODES.map(({ value, icon }) => {
                const isSelected = local.paymentMode === value;
                return (
                  <Pressable
                    key={value}
                    style={[styles.chip, styles.chipWithIcon, isSelected && styles.chipSelected]}
                    onPress={() => toggle('paymentMode', value)}
                  >
                    <FeatherIcon name={icon} size={13} color={isSelected ? BrandColors.teal : BrandColors.textSecondary} />
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{tOr(`centers.paymentModes.${value}`, value)}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Sort By */}
            <Text style={[styles.sectionTitle, { marginTop: Spacing.four }]}>{t('centers.filtersModal.sortBy')}</Text>
            <View style={styles.chipGroup}>
              {SORTS.map((sort) => {
                const isSelected = sortBy === sort;
                return (
                  <Pressable
                    key={sort}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => onSelectSort(sort)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{tOr(`centers.sorts.${sort}`, sort)}</Text>
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
              <Text style={styles.resetButtonText}>{activeCount > 0 ? t('centers.filtersModal.resetWithCount', { count: activeCount }) : t('centers.filtersModal.reset')}</Text>
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
                <Text style={styles.applyButtonText}>{t('centers.filtersModal.apply')}</Text>
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
    // Shrink within the sheet's maxHeight so the footer never covers content.
    flexShrink: 1,
  },
  // Padding lives on the content container (not the ScrollView itself) so the
  // bottom inset is part of the scrollable area and the last row can scroll
  // fully clear of the footer.
  bodyContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  priceTitle: {
    flexShrink: 1,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.textSecondary,
  },
  priceValueActive: {
    color: BrandColors.trainerAmber,
  },
  priceBounds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceBoundText: {
    fontSize: 11,
    color: BrandColors.textSecondary,
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
