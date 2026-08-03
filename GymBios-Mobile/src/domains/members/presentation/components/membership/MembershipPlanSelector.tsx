import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Typography } from '@/shared/components/Typography';
import type { MembershipPlan } from '@/domains/membershipPlans';

interface MembershipPlanSelectorProps {
  value: string;
  plans: MembershipPlan[];
  loading?: boolean;
  error?: Error | null;
  onChange: (planId: string, plan: MembershipPlan) => void;
  disabled?: boolean;
}

export function MembershipPlanSelector({
  value,
  plans,
  loading = false,
  error = null,
  onChange,
  disabled = false,
}: MembershipPlanSelectorProps) {
  const theme = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [query, setQuery] = useState('');

  const selectedPlan = plans.find((p) => String(p.id) === value);

  const filteredPlans = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.planType.toLowerCase().includes(q),
    );
  }, [plans, query]);

  const openSheet = () => {
    if (!disabled) {
      setQuery('');
      setSheetVisible(true);
    }
  };

  const handleSelect = (plan: MembershipPlan) => {
    onChange(String(plan.id), plan);
    setSheetVisible(false);
  };

  return (
    <View>
      <Typography variant="bodySmallBold" style={styles.label}>
        Membership Plan
        <Typography variant="bodySmallBold" style={{ color: theme.error }}>
          {' *'}
        </Typography>
      </Typography>

      <Pressable
        onPress={openSheet}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Membership Plan"
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: pressed && !disabled ? theme.primary : theme.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Typography
          variant="bodySmall"
          numberOfLines={1}
          style={[
            styles.valueText,
            { color: selectedPlan ? theme.text : theme.textSecondary },
          ]}
        >
          {selectedPlan ? selectedPlan.name : 'Select a membership plan'}
        </Typography>
        <Feather name="chevron-down" size={18} color={theme.textSecondary} />
      </Pressable>

      <AppBottomSheet
        visible={sheetVisible}
        title="Membership Plan"
        onClose={() => setSheetVisible(false)}
      >
        {/* Search input */}
        <View style={[styles.searchBox, { borderColor: theme.border }]}>
          <Feather name="search" size={16} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInputText, { color: theme.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search plans..."
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              style={styles.searchPressable}
              hitSlop={8}
            >
              <Feather name="x" size={16} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>

        {loading && (
          <Typography variant="bodySmall" color="textSecondary" style={styles.statusText}>
            Loading plans...
          </Typography>
        )}

        {!loading && error && (
          <Typography variant="bodySmall" color="error" style={styles.statusText}>
            Failed to load plans
          </Typography>
        )}

        {!loading && !error && filteredPlans.length === 0 && (
          <Typography variant="bodySmall" color="textSecondary" style={styles.statusText}>
            No plans found
          </Typography>
        )}

        {filteredPlans.map((plan) => {
          const isSelected = String(plan.id) === value;
          return (
            <Pressable
              key={plan.id}
              onPress={() => handleSelect(plan)}
              style={({ pressed }) => [
                styles.optionRow,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.optionTextContainer}>
                <Typography
                  variant="body"
                  style={[
                    styles.optionName,
                    { color: isSelected ? theme.primary : theme.text },
                  ]}
                >
                  {plan.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {plan.durationValue} {plan.durationType} · {plan.price}
                </Typography>
              </View>
              {isSelected ? (
                <Feather name="check" size={18} color={theme.primary} />
              ) : null}
            </Pressable>
          );
        })}
      </AppBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: Spacing.one,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  valueText: {
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    minHeight: 40,
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  searchInputText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: Spacing.one,
  },
  searchPressable: {
    padding: Spacing.half,
  },
  statusText: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    gap: Spacing.two,
  },
  optionTextContainer: {
    flex: 1,
    gap: Spacing.half,
  },
  optionName: {
    flexShrink: 1,
  },
});