import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { BrandColors, Spacing, TypographyScale } from '@/core/theme';
import { AppBottomSheet, Button } from '@/shared/components';
import type { AddOn } from '../../domain/models';

export interface AddOnDetailsBottomSheetProps {
  visible: boolean;
  addOn: AddOn | null;
  onClose: () => void;
  onBuyNow: (addOn: AddOn) => void;
}

export function AddOnDetailsBottomSheet({
  visible,
  addOn,
  onClose,
  onBuyNow,
}: AddOnDetailsBottomSheetProps) {
  if (!addOn) {
    return null;
  }

  return (
    <AppBottomSheet
      visible={visible}
      title="Add-On Details"
      onClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>{addOn.name}</Text>
          <Text style={styles.price}>
            {addOn.currency === 'INR' ? '₹' : addOn.currency}
            {addOn.price} / {addOn.pricingUnit}
          </Text>
        </View>

        {!!addOn.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{addOn.description}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <Button
            title="Buy Now"
            onPress={() => onBuyNow(addOn)}
            size="lg"
            style={styles.buyButton}
          />
        </View>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    gap: Spacing.six,
  },
  headerSection: {
    gap: Spacing.two,
  },
  title: {
    fontSize: TypographyScale.title,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  price: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.memberGold,
  },
  descriptionSection: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: TypographyScale.body,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  descriptionText: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
    lineHeight: 22,
  },
  actions: {
    marginTop: Spacing.two,
  },
  buyButton: {
    width: '100%',
  },
});
