import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';
import type { Member } from '@/domains/members/domain/Member';
import { useMemberSearch } from '@/domains/members/hooks/useMemberSearch';

import { usePendingBills } from '../../hooks/useBills';
import { useSettlePayment } from '../../hooks/useBillActions';
import type { Bill } from '../../domain/Bill';
import { PaymentMethod, type Receipt } from '../../domain/Receipt';
import {
  BillingSkeleton,
  EmptyBillingState,
  MoneyText,
  PaymentStatusBadge,
  PendingBillCard,
} from '../components';

import { toast } from '@/shared/components/Toasts/toastStore';

interface CreateReceiptScreenProps {
  onBack: () => void;
  onReceiptCreated?: (receiptId: string) => void;
  onViewMemberProfile?: (memberId: number) => void;
}

/**
 * Dedicated Create Receipt Screen.
 *
 * Flow:
 *  Step 1: Autocomplete Member Search (Name, Member ID, Phone, Email)
 *  Step 2: Selected Member Details Card (View Profile, Clear Selection)
 *  Step 3: Pending Bills Selection List (Multi-select, Auto Apply)
 *  Step 4: Proceed to Payment -> Payment Bottom Sheet (Method, Date, Summary, Generate Receipt, Cancel)
 */
export function CreateReceiptScreen({
  onBack,
  onReceiptCreated,
  onViewMemberProfile,
}: CreateReceiptScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Selected bill IDs for payment
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());

  // Payment Bottom Sheet state
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Cash);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Debounced backend member search — the single source of truth for lookup.
  const { members: searchPool, loading: searchLoading, empty: noResults } = useMemberSearch(searchQuery);

  // Query pending bills for selected member — disabled until a valid member is selected
  const { bills, loading: billsLoading, refresh: refreshBills } = usePendingBills(selectedMember?.id);

  // Mutation for settling payment
  const settlePaymentMutation = useSettlePayment();

  const handleSelectMember = useCallback((member: Member) => {
    setSelectedMember(member);
    setSearchQuery(member.name);
    setShowSuggestions(false);
    setSelectedBillIds(new Set());
  }, []);

  const handleClearMember = useCallback(() => {
    setSelectedMember(null);
    setSearchQuery('');
    setShowSuggestions(true);
    setSelectedBillIds(new Set());
  }, []);

  const toggleBillSelection = useCallback((billId: string) => {
    setSelectedBillIds((prev) => {
      const next = new Set(prev);
      if (next.has(billId)) {
        next.delete(billId);
      } else {
        next.add(billId);
      }
      return next;
    });
  }, []);

  const handleSelectAllBills = useCallback(() => {
    if (selectedBillIds.size === bills.length) {
      setSelectedBillIds(new Set());
    } else {
      setSelectedBillIds(new Set(bills.map((b) => b.id)));
    }
  }, [bills, selectedBillIds.size]);

  // Financial totals for selected bills
  const selectedBillsList = useMemo(
    () => bills.filter((b) => selectedBillIds.has(b.id)),
    [bills, selectedBillIds],
  );

  const totalOutstandingForMember = useMemo(
    () => bills.reduce((sum, b) => sum + b.dueAmount, 0),
    [bills],
  );

  const totalSelectedAmount = useMemo(
    () => selectedBillsList.reduce((sum, b) => sum + b.dueAmount, 0),
    [selectedBillsList],
  );

  const remainingBalanceAfterPayment = totalOutstandingForMember - totalSelectedAmount;

  const handleProceedToPayment = useCallback(() => {
    if (selectedBillIds.size === 0) {
      toast.info('Please select at least one pending bill to proceed.', {
        title: 'Bill Required'
      });
      return;
    }
    setPaymentSheetVisible(true);
  }, [selectedBillIds.size]);

  const handleGenerateReceipt = useCallback(() => {
    if (!selectedMember || selectedBillsList.length === 0) return;

    const request = {
      memberDbId: selectedMember.id,
      paymentMethod: selectedPaymentMethod,
      paymentDate: paymentDate,
      billPayments: selectedBillsList.map((b) => ({
        receiptId: parseInt(b.id, 10) || 1,
        payAmount: b.dueAmount,
      })),
    };

    settlePaymentMutation.mutate(request, {
      onSuccess: (newReceipt: Receipt) => {
        setPaymentSheetVisible(false);
        Alert.alert(
          'Receipt Generated!',
          `Payment of ₹${totalSelectedAmount.toLocaleString('en-IN')} collected for ${selectedMember.name}. Receipt ${newReceipt?.receiptNo ?? ''} issued.`,
          [
            {
              text: 'View Receipt',
              onPress: () => onReceiptCreated?.(newReceipt.id ?? '1'),
            },
            { text: 'Done', onPress: onBack },
          ],
        );
      },
      onError: () => {
        setPaymentSheetVisible(false);
        toast.error('Could not record payment. Please try again.', {
          title: 'Payment Error'
        });
      },
    });
  }, [
    selectedMember,
    selectedBillsList,
    selectedPaymentMethod,
    paymentDate,
    settlePaymentMutation,
    totalSelectedAmount,
    onReceiptCreated,
    onBack,
  ]);

  const paymentMethodsList = [
    { method: PaymentMethod.Cash, label: 'Cash', icon: 'dollar-sign' as const },
    { method: PaymentMethod.Card, label: 'Card', icon: 'credit-card' as const },
    { method: PaymentMethod.BankTransfer, label: 'Bank Transfer', icon: 'home' as const },
    { method: PaymentMethod.Online, label: 'Online / UPI', icon: 'globe' as const },
  ];

  return (
    <ScreenLayout>
      <AppHeader
        title="Create Receipt"
        subtitle="Collect Payment & Issue Receipt"
        colors={['#327f74', '#2a6b62']}
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Step 1: Member Autocomplete Search ─────────────────── */}
        <View style={styles.sectionCard}>
          <Typography variant="bodySmallBold" style={styles.sectionTitle}>
            Step 1: Select Member
          </Typography>
          <Typography variant="caption" color="textSecondary" style={styles.sectionSubtitle}>
            Search member by Name, Member ID, Phone, or Email
          </Typography>

          <View style={styles.searchBox}>
            <Feather name="search" size={16} color={BrandColors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Type member name, ID, phone..."
              placeholderTextColor={BrandColors.textSecondary}
              value={searchQuery}
              onFocus={() => setShowSuggestions(true)}
              onChangeText={(text) => {
                setSearchQuery(text);
                setSelectedMember(null);
                setShowSuggestions(true);
              }}
            />
            {selectedMember && (
              <Pressable onPress={handleClearMember} style={styles.clearBtn}>
                <Feather name="x-circle" size={16} color={BrandColors.textSecondary} />
              </Pressable>
            )}
          </View>

          {/* Suggestions Dropdown — populated from the Members domain */}
          {showSuggestions && !selectedMember && (
            <View style={styles.suggestionsContainer}>
              {searchLoading ? (
                <View style={styles.noResultsItem}>
                  <Typography variant="caption" color="textSecondary">
                    Searching members...
                  </Typography>
                </View>
              ) : noResults || searchPool.length === 0 ? (
                <View style={styles.noResultsItem}>
                  <Typography variant="caption" color="textSecondary">
                    No matching members found.
                  </Typography>
                </View>
              ) : (
                searchPool.map((m) => (
                  <Pressable
                    key={m.id}
                    style={({ pressed }) => [styles.suggestionItem, pressed && styles.pressed]}
                    onPress={() => handleSelectMember(m)}
                  >
                    <View style={styles.suggestionAvatar}>
                      <Typography variant="caption" style={styles.avatarText}>
                        {m.name[0].toUpperCase()}
                      </Typography>
                    </View>
                    <View style={styles.suggestionInfo}>
                      <Typography variant="bodySmallBold">{m.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        ID: {m.memberId} {m.phone ? `· ${m.phone}` : ''}
                      </Typography>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          )}
        </View>

        {/* ── Step 2: Selected Member Card ──────────────────────── */}
        {selectedMember && (
          <View style={styles.selectedMemberCard}>
            <View style={styles.memberHeader}>
              <View style={styles.avatarLarge}>
                <Typography variant="bodySmallBold" style={styles.avatarLargeText}>
                  {selectedMember.name[0].toUpperCase()}
                </Typography>
              </View>

              <View style={styles.memberInfoMain}>
                <Typography variant="bodySmallBold" style={{ fontSize: 16 }}>
                  {selectedMember.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Member ID: {selectedMember.memberId} {selectedMember.phone ? `· ${selectedMember.phone}` : ''}
                </Typography>
                {selectedMember.membershipType && (
                  <View style={styles.badgeChip}>
                    <Typography variant="caption" style={styles.badgeText}>
                      {selectedMember.membershipType}
                    </Typography>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.memberActionsRow}>
              {onViewMemberProfile && (
                <Pressable
                  onPress={() => onViewMemberProfile(selectedMember.id)}
                  style={styles.memberActionBtn}
                  accessibilityRole="button"
                >
                  <Feather name="user" size={14} color={BrandColors.teal} />
                  <Typography variant="caption" style={styles.memberActionText}>
                    View Profile
                  </Typography>
                </Pressable>
              )}

              <Pressable
                onPress={handleClearMember}
                style={[styles.memberActionBtn, { borderColor: '#fca5a5' }]}
                accessibilityRole="button"
              >
                <Feather name="x" size={14} color="#b91c1c" />
                <Typography variant="caption" style={{ color: '#b91c1c', fontWeight: '600' }}>
                  Clear Selection
                </Typography>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Step 3: Pending Bills List ────────────────────────── */}
        {selectedMember && (
          <View style={styles.sectionCard}>
            <View style={styles.billsHeaderRow}>
              <View>
                <Typography variant="bodySmallBold" style={styles.sectionTitle}>
                  Step 3: Select Pending Bills
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {bills.length} pending bill{bills.length !== 1 ? 's' : ''} available
                </Typography>
              </View>

              {bills.length > 0 && (
                <Pressable onPress={handleSelectAllBills} style={styles.selectAllBtn}>
                  <Typography variant="caption" style={{ color: BrandColors.teal, fontWeight: '700' }}>
                    {selectedBillIds.size === bills.length ? 'Deselect All' : 'Auto Apply'}
                  </Typography>
                </Pressable>
              )}
            </View>

            {billsLoading ? (
              <BillingSkeleton variant="list" count={3} />
            ) : bills.length === 0 ? (
              <EmptyBillingState
                title="No pending bills"
                description="This member has no outstanding bills to collect."
                icon="check-circle"
              />
            ) : (
              <View style={styles.billsList}>
                {bills.map((bill) => {
                  const isSelected = selectedBillIds.has(bill.id);
                  return (
                    <Pressable
                      key={bill.id}
                      style={[styles.billCardItem, isSelected && styles.billCardSelected]}
                      onPress={() => toggleBillSelection(bill.id)}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                        {isSelected && <Feather name="check" size={12} color="#ffffff" />}
                      </View>

                      <View style={styles.billContent}>
                        <View style={styles.billTopRow}>
                          <Typography variant="bodySmallBold">
                            {bill.receiptNo ?? `#${bill.id}`}
                          </Typography>
                          <PaymentStatusBadge status={bill.status} />
                        </View>

                        <Typography variant="caption" color="textSecondary">
                          Type: {bill.transactionType} · Due: ₹{bill.dueAmount.toLocaleString('en-IN')}
                        </Typography>
                      </View>

                      <MoneyText amount={bill.dueAmount} variant="bodySmallBold" color="#b91c1c" />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Sticky Proceed Button */}
      {selectedMember && bills.length > 0 && (
        <View style={styles.stickyFooter}>
          <View style={styles.footerSummaryRow}>
            <Typography variant="caption" color="textSecondary">
              {selectedBillIds.size} bill{selectedBillIds.size !== 1 ? 's' : ''} selected
            </Typography>
            <MoneyText amount={totalSelectedAmount} variant="bodySmallBold" color={BrandColors.teal} />
          </View>

          <Pressable
            onPress={handleProceedToPayment}
            disabled={selectedBillIds.size === 0}
            style={[styles.proceedBtn, selectedBillIds.size === 0 && styles.proceedBtnDisabled]}
            accessibilityRole="button"
          >
            <Typography variant="bodySmallBold" style={styles.proceedText}>
              Proceed to Payment
            </Typography>
            <Feather name="arrow-right" size={16} color="#ffffff" />
          </Pressable>
        </View>
      )}

      {/* Step 4: Payment Bottom Sheet Modal */}
      <Modal
        visible={paymentSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPaymentSheetVisible(false)} />

          <View style={styles.bottomSheetCard}>
            <View style={styles.sheetHandle} />

            <Typography variant="bodySmallBold" style={styles.sheetTitle}>
              Collect Payment & Issue Receipt
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Member: {selectedMember?.name}
            </Typography>

            {/* Payment Method Selector */}
            <Typography variant="caption" style={styles.fieldLabel}>
              Payment Method *
            </Typography>
            <View style={styles.methodsGrid}>
              {paymentMethodsList.map((pm) => {
                const isSelected = selectedPaymentMethod === pm.method;
                return (
                  <Pressable
                    key={pm.method}
                    style={[styles.methodChip, isSelected && styles.methodChipActive]}
                    onPress={() => setSelectedPaymentMethod(pm.method)}
                  >
                    <Feather
                      name={pm.icon}
                      size={14}
                      color={isSelected ? BrandColors.teal : BrandColors.textSecondary}
                    />
                    <Typography
                      variant="caption"
                      style={[styles.methodChipText, isSelected && styles.methodChipTextActive]}
                    >
                      {pm.label}
                    </Typography>
                  </Pressable>
                );
              })}
            </View>

            {/* Payment Date */}
            <Typography variant="caption" style={styles.fieldLabel}>
              Payment Date
            </Typography>
            <TextInput
              style={styles.dateInput}
              value={paymentDate}
              onChangeText={setPaymentDate}
              placeholder="YYYY-MM-DD"
            />

            {/* Receipt Summary Box */}
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Typography variant="caption" color="textSecondary">
                  Total Outstanding
                </Typography>
                <MoneyText amount={totalOutstandingForMember} variant="caption" />
              </View>
              <View style={styles.summaryRow}>
                <Typography variant="bodySmallBold" style={{ color: BrandColors.teal }}>
                  Receipt Total (Paid Now)
                </Typography>
                <MoneyText amount={totalSelectedAmount} variant="bodySmallBold" color={BrandColors.teal} />
              </View>
              <View style={styles.summaryRow}>
                <Typography variant="caption" color="textSecondary">
                  Remaining Balance
                </Typography>
                <MoneyText amount={remainingBalanceAfterPayment} variant="caption" color="#b91c1c" />
              </View>
            </View>

            {/* Actions */}
            <View style={styles.sheetActionsRow}>
              <Pressable
                style={styles.cancelSheetBtn}
                onPress={() => setPaymentSheetVisible(false)}
              >
                <Typography variant="bodySmallBold" style={styles.cancelSheetText}>
                  Cancel
                </Typography>
              </Pressable>

              <Pressable
                style={styles.generateReceiptBtn}
                onPress={handleGenerateReceipt}
                disabled={settlePaymentMutation.isPending}
              >
                <Typography variant="bodySmallBold" style={styles.generateReceiptText}>
                  {settlePaymentMutation.isPending ? 'Generating...' : 'Generate Receipt'}
                </Typography>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: 100,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
  },
  sectionSubtitle: {
    marginTop: -4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 44,
  },
  searchIcon: {
    marginRight: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: BrandColors.textPrimary,
  },
  clearBtn: {
    padding: 4,
  },
  suggestionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 4,
    maxHeight: 220,
    overflow: 'hidden',
  },
  noResultsItem: {
    padding: Spacing.three,
    alignItems: 'center',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two + 2,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pressed: {
    backgroundColor: BrandColors.screenBackgroundAlt,
  },
  suggestionAvatar: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.screenBackgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: BrandColors.teal,
    fontWeight: '700',
  },
  suggestionInfo: {
    flex: 1,
    gap: 1,
  },
  selectedMemberCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: BrandColors.teal,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatarLarge: {
    width: 46,
    height: 46,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.screenBackgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: {
    color: BrandColors.teal,
    fontSize: 18,
  },
  memberInfoMain: {
    flex: 1,
    gap: 2,
  },
  badgeChip: {
    backgroundColor: '#e0f2fe',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  badgeText: {
    color: '#0284c7',
    fontWeight: '600',
    fontSize: 10,
  },
  memberActionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  memberActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: BrandColors.teal,
  },
  memberActionText: {
    color: BrandColors.teal,
    fontWeight: '600',
  },
  billsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  selectAllBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  billsList: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  billCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  billCardSelected: {
    borderColor: BrandColors.teal,
    backgroundColor: BrandColors.screenBackgroundAlt,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: BrandColors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  billContent: {
    flex: 1,
    gap: 2,
  },
  billTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    padding: Spacing.three,
    gap: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    elevation: 8,
  },
  footerSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proceedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: BrandColors.teal,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
  },
  proceedBtnDisabled: {
    opacity: 0.5,
  },
  proceedText: {
    color: '#ffffff',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  bottomSheetCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.four,
    gap: Spacing.two,
    elevation: 10,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: '#d1d5db',
    alignSelf: 'center',
    marginBottom: Spacing.one,
  },
  sheetTitle: {
    fontSize: 16,
  },
  fieldLabel: {
    fontWeight: '600',
    marginTop: Spacing.one,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  methodChipActive: {
    borderColor: BrandColors.teal,
    backgroundColor: BrandColors.screenBackgroundAlt,
  },
  methodChipText: {
    color: BrandColors.textSecondary,
    fontWeight: '500',
  },
  methodChipTextActive: {
    color: BrandColors.teal,
    fontWeight: '700',
  },
  dateInput: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: Spacing.three,
    height: 40,
    fontSize: 14,
    color: BrandColors.textPrimary,
  },
  summaryBox: {
    backgroundColor: '#f9fafb',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: 6,
    marginTop: Spacing.one,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetActionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  cancelSheetBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: '#f3f4f6',
  },
  cancelSheetText: {
    color: BrandColors.textPrimary,
  },
  generateReceiptBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.teal,
  },
  generateReceiptText: {
    color: '#ffffff',
  },
});
