import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { toast } from '@/shared/components/Toasts/toastStore';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { Pagination } from '@/shared/components';
import { PaymentBottomSheet } from '@/shared/payment';
import type { PaymentResult } from '@/shared/payment/types';
import { AddOn, AddOnCatalogResponse } from '../../domain/models';
import { AddOnDetailsBottomSheet } from './AddOnDetailsBottomSheet';
import { usePurchaseAddOn } from '../../hooks/usePurchaseAddOn';

export interface MembershipAddonsTabProps {
  data?: AddOnCatalogResponse;
  isLoading: boolean;
  isError: boolean;
  page: number;
  setPage: (page: number) => void;
}

export function MembershipAddonsTab({ data, isLoading, isError, page, setPage }: MembershipAddonsTabProps) {
  const [selectedAddOn, setSelectedAddOn] = useState<AddOn | null>(null);
  const [paymentAddOn, setPaymentAddOn] = useState<AddOn | null>(null);
  
  const purchaseMutation = usePurchaseAddOn();

  const handleBuyNow = (addon: AddOn) => {
    // Close the details sheet.
    setSelectedAddOn(null);
    // Open the payment sheet.
    setPaymentAddOn(addon);
  };

  const handlePaymentComplete = (result: PaymentResult) => {
    if (!paymentAddOn) return;

    purchaseMutation.mutate(
      { addonId: paymentAddOn.id, paymentResult: result },
      {
        onSuccess: () => {
          toast.success(`${paymentAddOn.name} purchased successfully.`);
          setPaymentAddOn(null);
        },
        onError: (err: any) => {
          toast.error(err?.message || 'Could not process the purchase.', { title: 'Purchase Failed' });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { alignItems: 'center', padding: Spacing.four }]}>
        <ActivityIndicator size="large" color={BrandColors.teal} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', color: BrandColors.textSecondary }}>
          Failed to load add-ons.
        </Text>
      </View>
    );
  }

  const { available, active, pagination } = data;

  return (
    <View style={styles.container}>
      {/* Available Add-ons Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.cardTitle}>Available Add-ons</Text>
          <Feather name="gift" size={18} color={BrandColors.memberGold} />
        </View>

        <View style={styles.addonList}>
          {available.length === 0 ? (
            <Text style={{ textAlign: 'center', color: BrandColors.textSecondary, paddingVertical: Spacing.two }}>
              No add-ons available at the moment.
            </Text>
          ) : (
            available.map((addon) => (
              <View key={addon.id} style={styles.addonRow}>
                <View style={styles.addonInfo}>
                  <Text style={styles.addonName}>{addon.name}</Text>
                  <Text style={styles.addonPrice}>{addon.currency === 'INR' ? '₹' : addon.currency}{addon.price} / {addon.pricingUnit}</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
                  onPress={() => setSelectedAddOn(addon)}
                  accessibilityRole="button"
                  accessibilityLabel={`View details for ${addon.name}`}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      </View>

      {/* Active Add-ons Card */}
      <View style={styles.activeCard}>
        <Text style={styles.activeTitle}>Your Active Add-ons</Text>
        {active.length === 0 ? (
          <Text style={{ color: 'rgba(255,255,255,0.8)', paddingVertical: Spacing.two }}>
            You don't have any active add-ons yet.
          </Text>
        ) : (
          active.map((activeAddOn) => (
            <View key={activeAddOn.id} style={styles.activeItem}>
              <View style={styles.activeRow}>
                <Text style={styles.activeName}>{activeAddOn.addonName}</Text>
                <Text style={styles.activePrice}>{activeAddOn.status}</Text>
              </View>
            </View>
          ))
        )}
        <Text style={styles.activeSubtext}>
          Add more services to elevate your workout experience
        </Text>
      </View>

      <AddOnDetailsBottomSheet
        visible={!!selectedAddOn}
        addOn={selectedAddOn}
        onClose={() => setSelectedAddOn(null)}
        onBuyNow={handleBuyNow}
      />

      {paymentAddOn && (
        <PaymentBottomSheet
          visible={!!paymentAddOn}
          amount={paymentAddOn.price}
          title={paymentAddOn.name}
          subtitle={`Purchasing ${paymentAddOn.pricingUnit} add-on`}
          currency={paymentAddOn.currency === 'INR' ? '₹' : paymentAddOn.currency}
          allowDiscount={false}
          onClose={() => setPaymentAddOn(null)}
          onComplete={handlePaymentComplete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  card: {
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  cardTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  addonList: {
    gap: Spacing.two,
  },
  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  addonInfo: {
    flex: 1,
    paddingRight: Spacing.two,
  },
  addonName: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  addonPrice: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: BrandColors.memberGold,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  activeCard: {
    backgroundColor: BrandColors.tealDark,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  activeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  activeItem: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeName: {
    fontSize: TypographyScale.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  activePrice: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activeSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 4,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
