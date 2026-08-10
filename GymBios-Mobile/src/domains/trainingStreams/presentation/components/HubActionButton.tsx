import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface HubActionButtonProps extends PressableProps {
  title: string;
  iconName?: React.ComponentProps<typeof Feather>['name'];
}

export function HubActionButton({
  title,
  iconName,
  style,
  ...rest
}: HubActionButtonProps) {
  return (
    <Pressable
      style={(state) => [
        styles.container,
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ] as any}
      {...rest}
    >
      {iconName ? (
        <Feather
          name={iconName}
          size={16}
          color={BrandColors.teal}
        />
      ) : null}

      <Typography variant="bodySmallBold" style={styles.title}>
        {title}
      </Typography>

      <Feather
        name="chevron-right"
        size={16}
        color={BrandColors.teal}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: BrandColors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    borderRadius: Radius.md,
  },

  pressed: {
    opacity: 0.7,
  },

  title: {
    color: BrandColors.textPrimary,
  },
});