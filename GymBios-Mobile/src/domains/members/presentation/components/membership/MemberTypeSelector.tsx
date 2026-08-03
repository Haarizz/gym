import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { MEMBERSHIP_TYPES, type MembershipTypeOption } from '@/domains/members/constants';

interface MemberTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function MemberTypeSelector({
  value,
  onChange,
  disabled = false,
}: MemberTypeSelectorProps) {
  const theme = useTheme();

  return (
    <View style={styles.grid}>
      {MEMBERSHIP_TYPES.map((option: MembershipTypeOption) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled }}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: isSelected
                  ? theme.backgroundSelected
                  : theme.backgroundElement,
                borderColor: isSelected ? theme.primary : theme.border,
                borderWidth: isSelected ? 2 : 1,
                opacity: disabled ? 0.5 : 1,
              },
              pressed && !disabled && { opacity: 0.7 },
            ]}
          >
            <Feather
              name={option.icon}
              size={22}
              color={isSelected ? theme.primary : theme.textSecondary}
            />
            <Typography
              variant="bodySmallBold"
              style={[
                styles.label,
                { color: isSelected ? theme.primary : theme.text },
              ]}
            >
              {option.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    minHeight: 56,
  },
  label: {
    textTransform: 'capitalize',
  },
});