import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

interface CenterFiltersModalProps {
  visible: boolean;
  selectedCategory: string;
  selectedGender: string;
  sortBy: string;
  onSelectCategory: (cat: string) => void;
  onSelectGender: (gender: string) => void;
  onSelectSort: (sort: string) => void;
  onReset: () => void;
  onClose: () => void;
}

const CATEGORIES = ['All', 'Gym', 'Fitness Center', 'Wellness Center', 'Studio'];
const GENDERS = ['All', 'Mixed', 'Ladies Only', 'Men Only'];
const SORTS = ['Rating', 'Distance', 'Price'];

export function CenterFiltersModal({
  visible,
  selectedCategory,
  selectedGender,
  sortBy,
  onSelectCategory,
  onSelectGender,
  onSelectSort,
  onReset,
  onClose,
}: CenterFiltersModalProps) {
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
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.chipGroup}>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => onSelectCategory(cat)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Gender Type */}
            <Text style={[styles.sectionTitle, { marginTop: Spacing.four }]}>Access Type</Text>
            <View style={styles.chipGroup}>
              {GENDERS.map((gender) => {
                const isSelected = selectedGender === gender;
                return (
                  <Pressable
                    key={gender}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => onSelectGender(gender)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {gender}
                    </Text>
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
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {sort}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.resetButton} onPress={onReset}>
              <Text style={styles.resetButtonText}>Reset Filters</Text>
            </Pressable>
            <Pressable style={styles.applyButton} onPress={onClose}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
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
    maxHeight: '80%',
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
  chipSelected: {
    borderColor: BrandColors.teal,
    backgroundColor: '#F0FDFA',
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
  applyButton: {
    flex: 2,
    backgroundColor: BrandColors.teal,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
