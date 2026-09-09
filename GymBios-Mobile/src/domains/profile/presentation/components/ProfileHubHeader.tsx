import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Glass, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface ProfileHubHeaderProps {
  title?: string;
  onClose: () => void;
}

export function ProfileHubHeader({ title, onClose }: ProfileHubHeaderProps) {
  if (!title) {
    // No title — just float the close button absolutely, zero-height row
    return (
      <View style={styles.closeBtnOnly}>
        <Pressable
          hitSlop={14}
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Close profile hub"
        >
          <Feather name="x" size={20} color={BrandColors.textPrimary} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Typography variant="subtitle" style={styles.title}>
          {title}
        </Typography>
      </View>
      <Pressable
        hitSlop={14}
        onPress={onClose}
        style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Close profile hub"
      >
        <Feather name="x" size={20} color={BrandColors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // When there IS a title — full-width row
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    backgroundColor: 'transparent',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  // When there is NO title — just the close button aligned to top-right
  closeBtnOnly: {
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    backgroundColor: 'transparent',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Glass.fill,
    borderWidth: 1,
    borderColor: Glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    backgroundColor: Glass.fillStrong,
    transform: [{ scale: 0.94 }],
  },
});
