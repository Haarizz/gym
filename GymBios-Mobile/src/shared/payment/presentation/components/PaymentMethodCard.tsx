import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { PaymentMethodOption } from '@/shared/payment/constants';

interface PaymentMethodCardProps {
  option: PaymentMethodOption;
  isSelected: boolean;
  onSelect: () => void;
}

export function PaymentMethodCard({
  option,
  isSelected,
  onSelect,
}: PaymentMethodCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={option.title}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isSelected
            ? theme.primary + '10'
            : theme.backgroundElement,
          borderColor: isSelected ? theme.primary : theme.border,
          borderWidth: isSelected ? 2 : 1,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: isSelected
                ? theme.primary
                : option.badgeColor + '20',
            },
          ]}
        >
          <Feather
            name={option.iconName as any}
            size={18}
            color={isSelected ? theme.primaryText : option.badgeColor}
          />
        </View>

        {isSelected ? (
          <View
            style={[
              styles.checkBadge,
              { backgroundColor: theme.primary },
            ]}
          >
            <Feather name="check" size={12} color={theme.primaryText} />
          </View>
        ) : null}
      </View>

      <Typography
        variant="bodySmallBold"
        style={[
          styles.title,
          { color: isSelected ? theme.primary : theme.text },
        ]}
        numberOfLines={1}
      >
        {option.title}
      </Typography>

      <Typography
        variant="caption"
        style={{ color: theme.textSecondary, marginTop: 2 }}
        numberOfLines={1}
      >
        {option.subtitle}
      </Typography>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    justifyContent: 'space-between',
    minHeight: 96,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
  },
});
