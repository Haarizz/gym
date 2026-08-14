import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';

interface PromotionSearchProps {
  value: string;
  onChangeText: (text: string) => void;
  onOpenFilter: () => void;
  hasActiveFilters?: boolean;
}

export function PromotionSearch({
  value,
  onChangeText,
  onOpenFilter,
  hasActiveFilters = false,
}: PromotionSearchProps) {
  return (
    <View style={styles.container}>
      {/* Search Input Box */}
      <View style={styles.searchBox}>
        <Feather name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search by name, code, tags..."
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!!value && (
          <Pressable onPress={() => onChangeText('')} hitSlop={8}>
            <Feather name="x-circle" size={16} color="#94A3B8" />
          </Pressable>
        )}
      </View>

      {/* Filter Button */}
      <Pressable
        style={[
          styles.filterButton,
          hasActiveFilters && styles.activeFilterButton,
        ]}
        onPress={onOpenFilter}
      >
        <Feather
          name="sliders"
          size={18}
          color={hasActiveFilters ? '#FFFFFF' : BrandColors.teal}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: BrandColors.textPrimary,
    padding: 0,
  },
  filterButton: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.md,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeFilterButton: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
});
