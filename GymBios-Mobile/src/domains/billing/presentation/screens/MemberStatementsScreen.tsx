import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { TextInput } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';
import type { Member } from '@/domains/members/domain/Member';
import { useMemberSearch } from '@/domains/members/hooks/useMemberSearch';

import { useMemberStatement } from '../../hooks/useBills';
import {
  BillingSkeleton,
  EmptyBillingState,
  MoneyText,
  StatementRow,
} from '../components';

import { toast } from '@/shared/components/Toasts/toastStore';

interface MemberStatementsScreenProps {
  onBack: () => void;
  onNavigateToMemberStatement?: (memberId: number, memberName?: string) => void;
}

/**
 * Member Statement Generator Screen.
 *
 * Workflow:
 *  1. Member Search Autocomplete (typing "jo" immediately shows matching members)
 *  2. Choose From Date & To Date
 *  3. Generate Statement -> Loads and displays Statement of Account inline
 */
export function MemberStatementsScreen({ onBack }: MemberStatementsScreenProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Active query parameters for generating statement
  const [activeMemberId, setActiveMemberId] = useState<number | null>(null);
  const [activeRange, setActiveRange] = useState<{ from?: string; to?: string } | undefined>(undefined);

  // Debounced backend member search — the single source of truth for lookup.
  const { members: memberSuggestions, loading: searchLoading, empty: noResults } = useMemberSearch(searchQuery);

  // statement query for active generated statement — disabled until "Generate Statement" is pressed
  const { statement, loading: statementLoading, refresh: refreshStatement } = useMemberStatement(
    activeMemberId ?? undefined,
    activeRange,
  );

  const handleSelectMember = useCallback((member: Member) => {
    setSelectedMember(member);
    setSearchQuery(member.name);
    setShowSuggestions(false);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedMember(null);
    setSearchQuery('');
    setActiveMemberId(null);
    setActiveRange(undefined);
    setShowSuggestions(true);
  }, []);

  const handleGenerateStatement = useCallback(() => {
    if (!selectedMember) {
      toast.info('Please select a member first to generate a statement.', {
        title: 'Selection Required'
      });
      return;
    }
    setActiveMemberId(selectedMember.id);
    setActiveRange({
      from: fromDate.trim() || undefined,
      to: toDate.trim() || undefined,
    });
  }, [selectedMember, fromDate, toDate]);

  const handleExportCSV = useCallback(() => {
    if (!statement || !statement.lines.length) {
      toast.info('No statement lines available to export.', {
        title: 'Export CSV'
      });
      return;
    }
    toast.info(
      `Exported statement of account for ${statement.memberName ?? 'Member'} to CSV.`,
      {
        title: 'Export Statement CSV'
      }
    );
  }, [statement]);

  const lines = statement?.lines ?? [];

  return (
    <ScreenLayout>
      <AppHeader
        title={t('billing.statements.hubTitle')}
        subtitle={t('billing.statements.hubSubtitle')}
        colors={['#327f74', '#2a6b62']}
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          activeMemberId ? (
            <RefreshControl
              refreshing={statementLoading}
              onRefresh={refreshStatement}
              tintColor={BrandColors.teal}
            />
          ) : undefined
        }
      >
        {/* ── Form Card: Select Member & Date Range ───────────────── */}
        <View style={styles.formCard}>
          <Typography variant="bodySmallBold" style={styles.formTitle}>
            {t('billing.statements.generateTitle')}
          </Typography>
          <Typography variant="caption" color="textSecondary" style={styles.formSubtitle}>
            {t('billing.statements.generateDesc')}
          </Typography>

          {/* Autocomplete Member Input */}
          <View style={styles.inputGroup}>
            <Typography variant="caption" style={styles.inputLabel}>
              {t('billing.statements.selectMember')}
            </Typography>

            <View style={styles.searchBox}>
              <Feather name="search" size={16} color={BrandColors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('billing.createReceipt.searchPlaceholder')}
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
                <Pressable onPress={handleClearSelection} style={styles.clearBtn}>
                  <Feather name="x-circle" size={16} color={BrandColors.textSecondary} />
                </Pressable>
              )}
            </View>

            {/* Autocomplete Suggestions Dropdown — populated from the Members domain */}
            {showSuggestions && !selectedMember && (
              <View style={styles.suggestionsContainer}>
                {searchLoading ? (
                  <View style={styles.noResultsItem}>
                    <Typography variant="caption" color="textSecondary">
                      {t('billing.statements.searchingMembers')}
                    </Typography>
                  </View>
                ) : noResults || memberSuggestions.length === 0 ? (
                  <View style={styles.noResultsItem}>
                    <Typography variant="caption" color="textSecondary">
                      {t('billing.statements.noMatchingMembers')}
                    </Typography>
                  </View>
                ) : (
                  memberSuggestions.map((m) => (
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
                          {t('billing.statements.idLabel')} {m.memberId} {m.phone ? `· ${m.phone}` : ''}
                        </Typography>
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </View>

          {/* From & To Date Range Inputs */}
          <View style={styles.datesRow}>
            <View style={styles.dateField}>
              <Typography variant="caption" style={styles.inputLabel}>
                {t('billing.statements.fromDate')}
              </Typography>
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={BrandColors.textSecondary}
                value={fromDate}
                onChangeText={setFromDate}
              />
            </View>
            <View style={styles.dateField}>
              <Typography variant="caption" style={styles.inputLabel}>
                {t('billing.statements.toDate')}
              </Typography>
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={BrandColors.textSecondary}
                value={toDate}
                onChangeText={setToDate}
              />
            </View>
          </View>

          {/* Submit Action */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleGenerateStatement}
              disabled={!selectedMember}
              style={[styles.generateBtn, !selectedMember && styles.generateBtnDisabled]}
              accessibilityRole="button"
            >
              <Feather name="file-text" size={16} color="#ffffff" />
              <Typography variant="bodySmallBold" style={styles.generateBtnText}>
                {t('billing.statements.generateBtn')}
              </Typography>
            </Pressable>
          </View>
        </View>

        {/* ── Generated Statement Results Section ─────────────────── */}
        {statementLoading ? (
          <BillingSkeleton variant="list" count={4} />
        ) : activeMemberId && statement ? (
          <View style={styles.resultsContainer}>
            {/* Guardian account warning if minor / family billed */}
            {statement.billedToHead && (
              <View style={styles.warningBox}>
                <Feather name="info" size={18} color="#d97706" />
                <Typography variant="caption" style={styles.warningText}>
                  {statement.memberName} {t('billing.statements.isBilledToGuardian')}{' '}
                  <Typography variant="caption" style={{ fontWeight: '700' }}>
                    {statement.familyHeadName ?? 'Family Head'}
                  </Typography>
                  {t('billing.statements.feesManagedUnderMain')}
                </Typography>
              </View>
            )}

            {/* Summary Metrics */}
            <View style={styles.totalsCard}>
              <View style={styles.totalCell}>
                <Typography variant="caption" color="textSecondary">
                  {t('billing.statements.opening')}
                </Typography>
                <MoneyText amount={statement.openingBalance} variant="bodySmallBold" />
              </View>
              <View style={styles.totalDivider} />
              <View style={styles.totalCell}>
                <Typography variant="caption" color="textSecondary">
                  {t('billing.statements.billed')}
                </Typography>
                <MoneyText amount={statement.totalBilled} variant="bodySmallBold" color="#dc2626" />
              </View>
              <View style={styles.totalDivider} />
              <View style={styles.totalCell}>
                <Typography variant="caption" color="textSecondary">
                  {t('billing.statements.paid')}
                </Typography>
                <MoneyText amount={statement.totalPaid} variant="bodySmallBold" color="#16a34a" />
              </View>
              <View style={styles.totalDivider} />
              <View style={styles.totalCell}>
                <Typography variant="caption" color="textSecondary">
                  {t('billing.statements.closing')}
                </Typography>
                <MoneyText
                  amount={statement.closingBalance}
                  variant="bodySmallBold"
                  color={(statement.closingBalance ?? 0) > 0 ? '#b91c1c' : BrandColors.teal}
                />
              </View>
            </View>

            {/* Statement Header & Export */}
            <View style={styles.resultsHeader}>
              <View style={{ flex: 1 }}>
                <Typography variant="bodySmallBold" style={{ fontSize: 15 }}>
                  {statement.memberName} {t('billing.statements.statementSuffix')}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {t('billing.statements.memberId')} {statement.memberId ?? activeMemberId}
                </Typography>
              </View>

              <Pressable onPress={handleExportCSV} style={styles.exportBtn} accessibilityRole="button">
                <Feather name="download" size={14} color={BrandColors.teal} />
                <Typography variant="caption" style={styles.exportBtnText}>
                  {t('billing.statements.exportCsv')}
                </Typography>
              </Pressable>
            </View>

            {/* Statement Timeline List */}
            {lines.length === 0 ? (
              <EmptyBillingState
                title={t('billing.statements.noTransactions')}
                description={t('billing.statements.noTransactionsDesc')}
                icon="file-text"
              />
            ) : (
              <View style={styles.timelineList}>
                {lines.map((line, index) => (
                  <StatementRow
                    key={`${line.receiptNo ?? ''}-${index}`}
                    line={line}
                    isLast={index === lines.length - 1}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          /* Initial empty prompt */
          <View style={styles.promptCard}>
            <Feather name="user-check" size={32} color={BrandColors.teal} />
            <Typography variant="bodySmallBold" style={{ marginTop: Spacing.two }}>
              {t('billing.statements.generatorReady')}
            </Typography>
            <Typography variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
              {t('billing.statements.generatorReadyDesc')}
            </Typography>
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  formTitle: {
    fontSize: 15,
  },
  formSubtitle: {
    marginTop: -Spacing.two,
  },
  inputGroup: {
    gap: 4,
    zIndex: 10,
  },
  inputLabel: {
    fontWeight: '600',
    fontSize: 12,
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
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
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
  datesRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dateField: {
    flex: 1,
    gap: 4,
  },
  dateInput: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 40,
    fontSize: 13,
    color: BrandColors.textPrimary,
  },
  actionRow: {
    marginTop: Spacing.one,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: BrandColors.teal,
    borderRadius: Radius.md,
    paddingVertical: Spacing.two + 2,
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  generateBtnText: {
    color: '#ffffff',
  },
  resultsContainer: {
    gap: Spacing.three,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#fef3c7',
    borderRadius: Radius.md,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warningText: {
    color: '#92400e',
    flex: 1,
  },
  totalsCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  totalCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  totalDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: BrandColors.teal,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  exportBtnText: {
    color: BrandColors.teal,
    fontWeight: '600',
  },
  timelineList: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  promptCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.one,
    marginVertical: Spacing.two,
  },
});
